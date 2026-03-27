# Publisher Verification Guide

This document tracks the steps to get a verified publisher badge on the ShiftWorker Azure OAuth consent screen.

## Current Status

**The consent screen currently shows:**
- App name: ShiftWorker ✅
- Publisher domain: shiftworker.ai ✅  
- Terms of service + privacy links ✅
- "unverified" label - requires MPN enrollment to remove

**What's been completed:**
- [x] Azure app registration renamed to "ShiftWorker"
- [x] Branding URLs set (homepage, terms, privacy)
- [x] Azure Service Management > user_impersonation permission added
- [x] shiftworker.ai verified as custom domain in Azure AD tenant
- [x] Publisher domain updated from agentrichingsgmail.onmicrosoft.com to shiftworker.ai
- [x] Work account created: admin@shiftworker.ai (Global Admin)
- [x] MFA configured on admin@shiftworker.ai (Microsoft Authenticator on Julie's iPhone)
- [x] Email routing: admin@shiftworker.ai forwards to agentrichings@gmail.com via Cloudflare
- [x] Partner Center accessible with admin@shiftworker.ai
- [x] MPN enrollment form partially completed

## What's Needed to Complete Verification

### 1. Register a Business Entity
Microsoft Partner Network requires a legal business entity. Options:

**Recommended: Washington State Sole Proprietorship**
- File online at https://secure.dor.wa.gov/home/
- Cost: ~$19
- Time: same day
- No state income tax in WA
- Use Julie's Renton address (17010 193rd Ave SE, Renton WA 98058)

**Alternative: New WA LLC**
- More paperwork and quarterly filings
- Better liability protection
- Not needed just for MPN - can upgrade later

**Do NOT use:** The existing rental property LLC (mixing business types is bad for liability and accounting)

### 2. Complete MPN Enrollment
1. Go to https://partner.microsoft.com/dashboard
2. Sign in as admin@shiftworker.ai (password in TOOLS.md)
3. Approve MFA on Authenticator app
4. Select "Microsoft AI Cloud Partner Program"
5. Fill in company details with the registered business info
6. Accept the agreement
7. Note the MPN ID after enrollment

### 3. Link MPN to App Registration  
1. Go to Azure Portal > App registrations > ShiftWorker (0f2b6e21-a1f7-4f73-8a45-fc3cede31dc0)
2. Branding & properties > Publisher verification
3. Enter the MPN ID
4. The primary domain on the MPN account must match shiftworker.ai
5. Click "Verify and save"
6. Blue verified badge should appear on consent screen

## Infrastructure Reference

### Azure AD Tenant
- **Tenant ID:** 943cf1f9-5f5b-41cf-8f2d-a8ddafb483c1
- **Domain:** agentrichingsgmail.onmicrosoft.com
- **Custom domain:** shiftworker.ai (verified)
- **Admin:** agentrichings@gmail.com (personal account, Global Admin)
- **Work account:** admin@shiftworker.ai (Global Admin, MFA enabled)

### App Registrations
| Field | Original | Production |
|-------|----------|------------|
| Name | ShiftWorker | ShiftWorker |
| Client ID | d64e14f7-25b4-4796-95e2-ed137edd8cf4 | 0f2b6e21-a1f7-4f73-8a45-fc3cede31dc0 |
| Created | 3/25/2026 | 3/26/2026 |
| Used in Vercel | No | Yes (AZURE_CLIENT_ID) |
| Publisher domain | agentrichingsgmail.onmicrosoft.com | shiftworker.ai |
| API permissions | User.Read | User.Read + user_impersonation |

### DNS (Cloudflare)
- **Zone:** shiftworker.ai
- **Zone ID:** 14be4b47bd1152debdc15c7174fc7482
- **Account:** agentrichings@gmail.com (Google SSO)
- **Dashboard:** https://dash.cloudflare.com/d234eecdb5d66a2a84d392e3605ee1ec/shiftworker.ai
- **Email routing:**
  - hello@shiftworker.ai -> agentrichings@gmail.com
  - admin@shiftworker.ai -> agentrichings@gmail.com
- **DNS verification:** TXT record MS=ms84271085

### Vercel Environment Variables
| Variable | Description |
|----------|-------------|
| AZURE_CLIENT_ID | 0f2b6e21-a1f7-4f73-8a45-fc3cede31dc0 |
| AZURE_CLIENT_SECRET | (in Vercel) |
| AZURE_TENANT_ID | 943cf1f9-5f5b-41cf-8f2d-a8ddafb483c1 |
| AZURE_REDIRECT_URI | https://shiftworker.ai/api/auth/azure/callback |

## Azure OAuth Flow (How It Works)

The OAuth flow uses the **tenant-specific endpoint** with ARM scope:

1. User clicks "Connect Azure" in onboarding
2. Redirected to `login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/authorize`
3. Scope includes `https://management.azure.com/user_impersonation`
4. User signs in with their Microsoft account and consents to ARM access
5. Callback exchanges code for ARM-scoped tokens (single step)
6. Tokens stored encrypted in Supabase
7. Launch uses stored tokens to provision Azure VMs

**Key learning:** Personal Microsoft accounts cannot get ARM tokens through /common or /consumers endpoints. Must use the specific Azure AD tenant endpoint where the subscription lives.
