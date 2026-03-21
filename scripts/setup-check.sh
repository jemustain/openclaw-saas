#!/usr/bin/env bash
# HandsOff Setup Checker
# Validates that all required services are configured correctly.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

pass=0
fail=0
warn=0

ok()   { echo -e "  ${GREEN}✓${NC} $1"; ((pass++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((fail++)); }
warn() { echo -e "  ${YELLOW}!${NC} $1"; ((warn++)); }

check_var() {
  local name="$1"
  local val="${!name:-}"
  if [[ -n "$val" ]]; then
    ok "$name is set"
    return 0
  else
    fail "$name is not set"
    return 1
  fi
}

# Load .env.local if present
ENV_FILE="${ENV_FILE:-apps/web/.env.local}"
if [[ -f "$ENV_FILE" ]]; then
  echo -e "${BOLD}Loading env from $ENV_FILE${NC}\n"
  set -a
  source "$ENV_FILE"
  set +a
fi

echo -e "${BOLD}=== HandsOff Setup Check ===${NC}\n"

# --- Supabase ---
echo -e "${BOLD}Supabase${NC}"
check_var NEXT_PUBLIC_SUPABASE_URL
check_var NEXT_PUBLIC_SUPABASE_ANON_KEY

if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    ok "Supabase connection OK (HTTP $status)"
  else
    fail "Supabase connection failed (HTTP $status)"
  fi
fi
echo

# --- Stripe ---
echo -e "${BOLD}Stripe${NC}"
check_var STRIPE_SECRET_KEY
check_var NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
check_var STRIPE_WEBHOOK_SECRET
check_var STRIPE_PRICE_STARTER
check_var STRIPE_PRICE_PRO

if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${STRIPE_SECRET_KEY}:" \
    "https://api.stripe.com/v1/balance" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    ok "Stripe API connection OK"
  else
    fail "Stripe API connection failed (HTTP $status)"
  fi
fi
echo

# --- DigitalOcean ---
echo -e "${BOLD}DigitalOcean${NC}"
check_var DO_API_TOKEN

if [[ -n "${DO_API_TOKEN:-}" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $DO_API_TOKEN" \
    "https://api.digitalocean.com/v2/account" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    ok "DigitalOcean API connection OK"
  else
    fail "DigitalOcean API connection failed (HTTP $status)"
  fi
fi
echo

# --- Resend ---
echo -e "${BOLD}Resend${NC}"
check_var RESEND_API_KEY

if [[ -n "${RESEND_API_KEY:-}" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    "https://api.resend.com/domains" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    ok "Resend API connection OK"
  else
    fail "Resend API connection failed (HTTP $status)"
  fi
fi
echo

# --- App Config ---
echo -e "${BOLD}App Config${NC}"
check_var NEXT_PUBLIC_APP_URL
check_var CRON_SECRET
echo

# --- Summary ---
echo -e "${BOLD}=== Summary ===${NC}"
echo -e "  ${GREEN}✓ $pass passed${NC}"
[[ $fail -gt 0 ]] && echo -e "  ${RED}✗ $fail failed${NC}"
[[ $warn -gt 0 ]] && echo -e "  ${YELLOW}! $warn warnings${NC}"
echo

if [[ $fail -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All checks passed! You're ready to go. 🚀${NC}"
else
  echo -e "${RED}${BOLD}Some checks failed. See docs/SETUP.md for setup instructions.${NC}"
  exit 1
fi
