# Azure OAuth App Registration

## Overview

ShiftWorker uses Azure OAuth to let users connect their Azure subscriptions for VM provisioning. When a user clicks "Connect Azure," they authenticate with Microsoft, and ShiftWorker stores their tokens to manage VMs on their behalf.

## Azure App Registration Details

| Field | Value |
|-------|-------|
| App Name | ShiftWorker |
| Application (client) ID | `d64e14f7-25b4-4796-95e2-ed137edd8cf4` |
| Directory (tenant) ID | `943cf1f9-5f5b-41cf-8f2d-a8ddafb483c1` |
| Sign-in audience | Accounts in any organizational directory and personal Microsoft accounts (`AzureADandPersonalMicrosoftAccount`) |
| Redirect URI | `https://shiftworker.ai/api/auth/azure/callback` |
| Client secret | Stored in Vercel env vars (expires **9/21/2026**) |
| Registered under | agentrichings@gmail.com (Default Directory) |

## Required Vercel Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_CLIENT_ID` | Application (client) ID — `d64e14f7-25b4-4796-95e2-ed137edd8cf4` |
| `AZURE_CLIENT_SECRET` | Client secret value (from Azure portal) |
| `AZURE_REDIRECT_URI` | Must be `https://shiftworker.ai/api/auth/azure/callback` |

## OAuth Flow

1. User clicks **Connect Azure** in the ShiftWorker dashboard
2. Redirected to Microsoft login (`login.microsoftonline.com`) with the app's client ID and requested scopes
3. User authenticates and consents to the requested permissions
4. Microsoft redirects back to `https://shiftworker.ai/api/auth/azure/callback` with an authorization code
5. ShiftWorker exchanges the auth code for access + refresh tokens using the client secret
6. Tokens are stored encrypted in Supabase, linked to the user's account
7. ShiftWorker uses the tokens to manage Azure resources (VMs, etc.) on the user's behalf

## How to Rotate the Client Secret

1. Go to [Azure Portal → App registrations → ShiftWorker](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials)
2. Under **Certificates & secrets**, click **New client secret**
3. Set a description and expiry, then click **Add**
4. Copy the new secret **Value** (not the Secret ID)
5. Update `AZURE_CLIENT_SECRET` in Vercel environment variables (Settings → Environment Variables)
6. Redeploy the app
7. Delete the old secret from Azure portal

## Azure Free Account

- **Account:** agentrichings@gmail.com
- **Credit:** $200 free credit (30 days from 2026-03-25)
- **Purpose:** Development and testing only
- **Note:** Set up billing alerts to avoid unexpected charges after the free period
