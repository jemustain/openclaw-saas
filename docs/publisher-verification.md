# Publisher Verification Guide

This document tracks the steps to get a verified publisher badge on the ShiftWorker Azure OAuth consent screen.

## Why

When users sign in with Microsoft, they see "unverified" next to the app name. A verified publisher badge (blue checkmark) replaces this and builds trust.

## Prerequisites (DONE)

### 1. Azure App Registration
- **Production app:** `0f2b6e21-a1f7-4f73-8a45-fc3cede31dc0`
- **Name:** ShiftWorker (renamed from ShiftWorker-v2)
- **Branding configured:** Homepage, Terms of Service, Privacy Policy URLs set
- **API permissions:** Azure Service Management > user_impersonation (delegated)

### 2. Custom Domain Verified in Azure AD
- **Domain:** shiftworker.ai
- **Status:** VERIFIED ✅
- **DNS:** TXT record `MS=ms84271085` added in Cloudflare
- **Tenant:** Default Directory (`943cf1f9-5f5b-41cf-8f2d-a8ddafb483c1`)

### 3. DNS managed in Cloudflare
- **Account:** agentrichings@gmail.com (Google SSO)
- **Zone ID:** `14be4b47bd1152debdc15c7174fc7482`
- **Dashboard:** https://dash.cloudflare.com/d234eecdb5d66a2a84d392e3605ee1ec/shiftworker.ai

## Remaining Steps

### 3. Create Work Account
1. Go to Entra admin center > Users > New user
2. Create: `admin@shiftworker.ai`
3. Assign Global Administrator role
4. Set a strong password

### 4. Update App Publisher Domain
1. Go to Azure Portal > App registrations > ShiftWorker (the production one)
2. Branding & properties > Publisher domain > Update domain
3. Select `shiftworker.ai`

### 5. Enroll in Microsoft Partner Network
1. Go to https://partner.microsoft.com
2. Sign in with `admin@shiftworker.ai` (the work account)
3. Select "Independent Software Vendor (ISV)"
4. Complete enrollment (company name: ShiftWorker, contact domain: shiftworker.ai)
5. Note the MPN ID after enrollment

### 6. Link MPN to App Registration
1. Go to Azure Portal > App registrations > ShiftWorker > Branding & properties
2. Under "Publisher verification", enter the MPN ID
3. The primary domain on the MPN account must match the app's publisher domain (shiftworker.ai)
4. Click "Verify" - a blue verified badge should appear

## App Registrations Reference

| Field | Original | Production (v2) |
|-------|----------|-----------------|
| Name | ShiftWorker | ShiftWorker |
| Client ID | d64e14f7-25b4-4796-95e2-ed137edd8cf4 | 0f2b6e21-a1f7-4f73-8a45-fc3cede31dc0 |
| Created | 3/25/2026 | 3/26/2026 |
| Used in Vercel | No | Yes (AZURE_CLIENT_ID) |
| Redirect URI | https://shiftworker.ai/api/auth/azure/callback | https://shiftworker.ai/api/auth/azure/callback |

## Azure OAuth Flow Notes

- Personal Microsoft accounts need `/consumers` endpoint (not `/common`)
- ARM scope can't be requested in the initial authorize URL for personal accounts
- Two-step approach: identity tokens first, then refresh for ARM tokens via tenant endpoint
- App needs `Azure Service Management > user_impersonation` delegated permission
- Refresh uses `.default` scope with tenant-specific endpoint
