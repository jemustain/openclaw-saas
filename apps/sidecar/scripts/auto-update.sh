#!/bin/bash
# ShiftWorker Sidecar Auto-Update
# Runs via cron every hour. Downloads latest sidecar.cjs from GitHub,
# compares checksum, and restarts if changed.

set -euo pipefail

SIDECAR_DIR="/opt/shiftworker/sidecar"
SIDECAR_FILE="$SIDECAR_DIR/dist/sidecar.cjs"
GITHUB_URL="https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/dist/sidecar.cjs"
TMP_FILE="/tmp/sidecar-update.cjs"
LOG_TAG="sidecar-update"

# Download latest
if ! curl -sf -L "$GITHUB_URL" -o "$TMP_FILE" 2>/dev/null; then
  logger -t "$LOG_TAG" "Failed to download latest sidecar - skipping update"
  rm -f "$TMP_FILE"
  exit 0
fi

# Compare checksums
CURRENT_HASH=""
NEW_HASH=""
if [ -f "$SIDECAR_FILE" ]; then
  CURRENT_HASH=$(sha256sum "$SIDECAR_FILE" 2>/dev/null | cut -d' ' -f1)
fi
NEW_HASH=$(sha256sum "$TMP_FILE" 2>/dev/null | cut -d' ' -f1)

if [ "$CURRENT_HASH" = "$NEW_HASH" ]; then
  # No changes
  rm -f "$TMP_FILE"
  exit 0
fi

# Update
logger -t "$LOG_TAG" "New sidecar version detected (${NEW_HASH:0:12}), updating..."
mkdir -p "$SIDECAR_DIR/dist"
cp "$TMP_FILE" "$SIDECAR_FILE"
rm -f "$TMP_FILE"

# Restart sidecar service
if systemctl is-active --quiet shiftworker-sidecar 2>/dev/null; then
  systemctl restart shiftworker-sidecar
  logger -t "$LOG_TAG" "Sidecar restarted successfully"
elif systemctl is-active --quiet openclaw-sidecar 2>/dev/null; then
  systemctl restart openclaw-sidecar
  logger -t "$LOG_TAG" "Sidecar restarted successfully"
else
  logger -t "$LOG_TAG" "Warning: No sidecar service found to restart"
fi
