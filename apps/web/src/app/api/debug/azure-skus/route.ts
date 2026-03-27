import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProviderToken, refreshIfNeeded } from '@/lib/providers/token-store';

const ARM_BASE = 'https://management.azure.com';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const region = url.searchParams.get('region') || 'eastus';

    const tokenData = await refreshIfNeeded(session.userId, 'azure');
    if (!tokenData) {
      return NextResponse.json({ error: 'Azure not connected' }, { status: 400 });
    }

    // Get subscription
    const subsRes = await fetch(`${ARM_BASE}/subscriptions?api-version=2022-12-01`, {
      headers: { Authorization: `Bearer ${tokenData.accessToken}` },
    });
    const subsData = await subsRes.json();
    const sub = subsData.value?.find((s: any) => s.state === 'Enabled');
    if (!sub) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    // List resource SKUs with restrictions
    const skuRes = await fetch(
      `${ARM_BASE}/subscriptions/${sub.subscriptionId}/providers/Microsoft.Compute/skus?api-version=2021-07-01&$filter=location eq '${region}'`,
      { headers: { Authorization: `Bearer ${tokenData.accessToken}` } },
    );
    const skuData = await skuRes.json();

    // Filter to small VMs that are available (no restrictions)
    const available = (skuData.value || [])
      .filter((sku: any) => {
        if (sku.resourceType !== 'virtualMachines') return false;
        const caps = sku.capabilities || [];
        const vcpus = caps.find((c: any) => c.name === 'vCPUs')?.value;
        const mem = caps.find((c: any) => c.name === 'MemoryGB')?.value;
        if (!vcpus || parseInt(vcpus) > 2) return false;
        if (mem && parseFloat(mem) > 8) return false;

        // Check restrictions
        const restrictions = sku.restrictions || [];
        const notAvailable = restrictions.some((r: any) =>
          r.type === 'Location' && r.reasonCode === 'NotAvailableForSubscription'
        );
        const zoneRestricted = restrictions.some((r: any) =>
          r.type === 'Zone'
        );

        return !notAvailable;
      })
      .map((sku: any) => {
        const caps = sku.capabilities || [];
        const vcpus = caps.find((c: any) => c.name === 'vCPUs')?.value;
        const mem = caps.find((c: any) => c.name === 'MemoryGB')?.value;
        const restricted = (sku.restrictions || []).length > 0;
        return {
          name: sku.name,
          vcpus,
          memoryGB: mem,
          hasRestrictions: restricted,
          restrictions: (sku.restrictions || []).map((r: any) => r.reasonCode),
        };
      })
      .sort((a: any, b: any) => parseFloat(a.memoryGB || '0') - parseFloat(b.memoryGB || '0'));

    return NextResponse.json({
      region,
      subscriptionId: sub.subscriptionId,
      availableCount: available.length,
      sizes: available.slice(0, 20),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
