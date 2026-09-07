#!/usr/bin/env bash
# Update the WhatsApp-Slack Bridge to the latest published release.
#
#   ./update.sh              # updates ~/wa-bridge
#   ./update.sh /srv/bridge  # updates somewhere else
#
# Your WhatsApp session (auth_info_baileys/), Slack tokens (bridge_config.json)
# and message map are separate files, so they survive the swap.
set -euo pipefail

DIR="${1:-$HOME/wa-bridge}"
ASSET="whatsapp-slack-bridge-linux-x64"
URL="https://github.com/Slooquie/WhatsApp-Slack-Bridge/releases/latest/download/${ASSET}"
SERVICE="wa-bridge"

cd "$DIR"

echo "Downloading the latest release..."
# To a temp name first: a half-finished download must never replace a working binary.
curl -fL --progress-bar -o "${ASSET}.new" "$URL"

if [ ! -s "${ASSET}.new" ]; then
  echo "Download was empty - keeping the current binary." >&2
  rm -f "${ASSET}.new"
  exit 1
fi
chmod +x "${ASSET}.new"

# Only touch the service if it is actually installed.
HAVE_SERVICE=0
if systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE}.service"; then
  HAVE_SERVICE=1
fi

if [ "$HAVE_SERVICE" -eq 1 ]; then
  echo "Stopping ${SERVICE}..."
  sudo systemctl stop "$SERVICE"
fi

mv -f "${ASSET}.new" "$ASSET"

if [ "$HAVE_SERVICE" -eq 1 ]; then
  echo "Starting ${SERVICE}..."
  sudo systemctl start "$SERVICE"
  sleep 3
  systemctl status "$SERVICE" --no-pager | head -5
  echo
  echo "Running version:"
  journalctl -u "$SERVICE" -n 40 --no-pager | grep -o "version [^)]*" | tail -1 || echo "  (no version line yet - check journalctl -u ${SERVICE} -f)"
else
  echo "Updated. No ${SERVICE} service found, so start it yourself:"
  echo "  cd ${DIR} && ./${ASSET}"
fi
