#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Quick Runner for Express Backend & QR Engine
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/fix_and_start_backend.sh"
