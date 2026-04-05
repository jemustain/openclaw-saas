import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProviderToken, refreshProviderToken } from '@/lib/providers/token-store';
import { apiError, ERR } from '@/lib/errors';

interface VmSku {
  name: string;
  resourceType: string;
  locations: string[];
  capabilities: { name: string; value: string }[];
  restrictions: { reasonCode: string }[];
  family: string;
}

interface UsageEntry {
  name: { value: string; localizedValue: string };
  currentValue: number;
  limit: number;
  unit: string;
}

interface PricingItem {
  armSkuName: string;
  retailPrice: number;
  unitOfMeasure: string;
  type: string;
  productName: string;
  skuName: string;
  meterName: string;
}

interface PricingResponse {
  Items: PricingItem[];
  NextPageLink: string | null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError(ERR.UNAUTHORIZED, 401);

  const params = req.nextUrl.searchParams;
  const subscriptionId = params.get('subscriptionId');
  const region = params.get('region') || 'southcentralus';

  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
  }

  const tokenData = await getProviderToken(session.userId, 'azure');
  if (!tokenData) {
    return NextResponse.json({ error: 'Azure not connected' }, { status: 400 });
  }

  let accessToken = tokenData.accessToken;
  if (tokenData.expiresAt && tokenData.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    accessToken = await refreshProviderToken(session.userId, 'azure');
  }

  try {
    // 1. Fetch VM SKUs
    const skuUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/skus?api-version=2021-07-01&$filter=location eq '${region}'`;
    const skuRes = await fetch(skuUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!skuRes.ok) throw new Error(`SKU API: ${skuRes.status}`);
    const skuData = await skuRes.json();

    // 2. Fetch quota/usage
    const usageUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/locations/${region}/usages?api-version=2023-09-01`;
    const usageRes = await fetch(usageUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!usageRes.ok) throw new Error(`Usage API: ${usageRes.status}`);
    const usageData = await usageRes.json();

    // Build usage map: family -> { current, limit }
    const usageMap = new Map<string, { current: number; limit: number }>();
    for (const u of (usageData.value || []) as UsageEntry[]) {
      usageMap.set(u.name.value.toLowerCase(), { current: u.currentValue, limit: u.limit });
    }

    // 3. Fetch pricing (public, paginated)
    const priceMap = new Map<string, number>();
    let priceUrl: string | null =
      `https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines' and armRegionName eq '${region}' and priceType eq 'Consumption' and type eq 'Consumption'`;

    while (priceUrl) {
      const priceRes = await fetch(priceUrl);
      if (!priceRes.ok) break;
      const priceData: PricingResponse = await priceRes.json();
      for (const item of priceData.Items) {
        // Only Linux, non-Spot, non-LowPriority
        if (item.skuName.includes('Spot') || item.skuName.includes('Low Priority')) continue;
        if (!item.productName.includes('Windows') && item.meterName && !item.meterName.includes('Spot') && !item.meterName.includes('Low Priority')) {
          const existing = priceMap.get(item.armSkuName);
          if (existing === undefined || item.retailPrice < existing) {
            priceMap.set(item.armSkuName, item.retailPrice);
          }
        }
      }
      priceUrl = priceData.NextPageLink;
    }

    // 4. Filter and build result
    const sizes: {
      name: string;
      vCPUs: number;
      memoryGB: number;
      pricePerHour: number | null;
      pricePerMonth: number | null;
      available: boolean;
      family: string;
    }[] = [];

    for (const sku of (skuData.value || []) as VmSku[]) {
      if (sku.resourceType !== 'virtualMachines') continue;
      if (!sku.locations?.some((l: string) => l.toLowerCase() === region.toLowerCase())) continue;

      // Check restrictions
      const restricted = sku.restrictions?.some((r) => r.reasonCode === 'NotAvailableForSubscription');
      if (restricted) continue;

      // Get capabilities
      const caps = new Map(sku.capabilities.map((c) => [c.name, c.value]));
      const vCPUs = parseInt(caps.get('vCPUs') || '0', 10);
      const memoryGB = parseFloat(caps.get('MemoryGB') || '0');

      if (vCPUs < 1 || vCPUs > 8 || memoryGB < 1 || memoryGB > 32) continue;

      // Check quota availability
      const familyKey = (sku.family || caps.get('VMDeploymentTypes') || '').toLowerCase();
      // Try common family patterns for quota lookup
      const quotaKeys = [
        familyKey,
        `standard${sku.family || ''}family`,
        sku.family?.toLowerCase() || '',
      ];
      let available = true;
      for (const qk of quotaKeys) {
        const quota = usageMap.get(qk);
        if (quota && quota.current + vCPUs > quota.limit) {
          available = false;
          break;
        }
      }

      const pricePerHour = priceMap.get(sku.name) ?? null;
      const pricePerMonth = pricePerHour !== null ? Math.round(pricePerHour * 730 * 100) / 100 : null;

      sizes.push({
        name: sku.name,
        vCPUs,
        memoryGB,
        pricePerHour,
        pricePerMonth,
        available,
        family: sku.family || '',
      });
    }

    // Sort by price (cheapest first), nulls last
    sizes.sort((a, b) => {
      if (a.pricePerHour === null && b.pricePerHour === null) return 0;
      if (a.pricePerHour === null) return 1;
      if (b.pricePerHour === null) return -1;
      return a.pricePerHour - b.pricePerHour;
    });

    return NextResponse.json({ sizes });
  } catch (err) {
    console.error('Failed to fetch VM sizes:', err);
    return NextResponse.json(
      { error: 'Failed to fetch VM sizes. Please try again.' },
      { status: 500 },
    );
  }
}
