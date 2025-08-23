#!/bin/bash

# macOS Memory Cleanup Script
# Safely clears memory and reduces swap usage

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}         macOS MEMORY CLEANUP TOOL${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Show before stats
echo -e "${CYAN}BEFORE CLEANUP:${NC}"
echo "Memory Pressure: $(memory_pressure | grep "System-wide" | cut -d: -f2)"
vm_stat | grep -E "Pages free|Pages active|Pages inactive|Pages wired"
echo "Swap: $(sysctl vm.swapusage | awk '{print $7}')"
echo ""

# 1. Clear DNS Cache
echo -e "${YELLOW}→ Clearing DNS cache...${NC}"
sudo dscacheutil -flushcache 2>/dev/null
sudo killall -HUP mDNSResponder 2>/dev/null

# 2. Purge inactive memory (requires sudo)
echo -e "${YELLOW}→ Purging inactive memory...${NC}"
sudo purge

# 3. Clear system caches
echo -e "${YELLOW}→ Clearing system caches...${NC}"
# User cache (safe)
rm -rf ~/Library/Caches/* 2>/dev/null
# System cache (be careful)
sudo rm -rf /Library/Caches/* 2>/dev/null
sudo rm -rf /System/Library/Caches/* 2>/dev/null

# 4. Clear Chrome/Safari memory if running
echo -e "${YELLOW}→ Signaling browsers to reduce memory...${NC}"
# Chrome
killall -CONT "Google Chrome" 2>/dev/null
killall -CONT "Google Chrome Helper" 2>/dev/null
# Safari
killall -CONT Safari 2>/dev/null
killall -CONT "Safari Web Content" 2>/dev/null
# Firefox
killall -CONT firefox 2>/dev/null

# 5. Restart memory-heavy services
echo -e "${YELLOW}→ Restarting Spotlight...${NC}"
sudo mdutil -E / 2>/dev/null
sudo killall mds 2>/dev/null

# 6. Clear swap (aggressive - will pause system briefly)
echo -e "${YELLOW}→ Reducing swap usage...${NC}"
sudo sysctl vm.swappiness=5 2>/dev/null

# Wait for operations to complete
sleep 3

# Show after stats
echo ""
echo -e "${CYAN}AFTER CLEANUP:${NC}"
echo "Memory Pressure: $(memory_pressure | grep "System-wide" | cut -d: -f2)"
vm_stat | grep -E "Pages free|Pages active|Pages inactive|Pages wired"
echo "Swap: $(sysctl vm.swapusage | awk '{print $7}')"

echo ""
echo -e "${GREEN}✅ Memory cleanup complete!${NC}"
echo ""
echo -e "${CYAN}Additional manual steps for maximum effect:${NC}"
echo "1. Close and reopen memory-heavy apps (Chrome, Slack, etc.)"
echo "2. Disable unnecessary Login Items (System Settings > General > Login Items)"
echo "3. Check Activity Monitor > Memory tab for apps using excessive memory"
echo "4. Consider restarting if swap is still >1GB"