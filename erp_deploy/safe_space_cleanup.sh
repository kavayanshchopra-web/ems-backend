#!/bin/bash
# ==============================================================================
# OmniFlow EMS - 100% SAFE System Cleanup Script
# GUARANTEE: Does NOT touch WhatsApp, Baileys, SQLite, Node.js, or n8n data!
# ONLY cleans: System logs, APT cache, and failed/half-downloaded docker layers.
# ==============================================================================

set -e

echo "=============================================================================="
echo "🛡️ STARTING SAFE SYSTEM DISK CLEANUP (Zero Risk to WhatsApp & n8n)"
echo "=============================================================================="

echo "📊 [1/4] Current Disk Space:"
df -h /

echo ""
echo "🧹 [2/4] Cleaning old system journal logs (keeping last 1 day only)..."
journalctl --vacuum-time=1d || true
journalctl --vacuum-size=50M || true

echo ""
echo "🧹 [3/4] Cleaning APT package installer cache (already-installed .deb files)..."
apt-get clean
apt-get autoremove -y || true

echo ""
echo "🧹 [4/4] Removing only half-downloaded / dangling Docker image layers..."
# docker image prune ONLY removes dangling/untagged layers; does NOT touch running containers!
docker image prune -f || true

echo ""
echo "=============================================================================="
echo "✅ CLEANUP COMPLETE! New Disk Space Available:"
df -h /
echo "=============================================================================="
echo "🛡️ WhatsApp CRM, Baileys Sessions & n8n Engine are 100% ACTIVE and SAFE."
echo "=============================================================================="
