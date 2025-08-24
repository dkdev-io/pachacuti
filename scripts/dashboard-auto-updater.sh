#!/bin/bash

# Dashboard Auto-Updater
# Runs every 30 seconds to fetch real data

echo "🚀 Starting Dashboard Auto-Updater"
echo "📊 Real data will update every 30 seconds"
echo "🔑 Using Anthropic API key for real token data"
echo ""

# Load environment variables
source /Users/Danallovertheplace/pachacuti/.env

# Run continuously
while true; do
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - Fetching real data..."
    
    # Run the token fetcher with real API data
    node /Users/Danallovertheplace/pachacuti/scripts/anthropic-token-fetcher.js > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Data updated successfully"
        
        # Show brief summary
        TOKENS=$(grep '"inputTokens"' /Users/Danallovertheplace/pachacuti/devops/real-data.json | head -1 | grep -o '[0-9]*')
        COST=$(grep '"totalCost"' /Users/Danallovertheplace/pachacuti/devops/real-data.json | head -1 | grep -o '[0-9.]*')
        
        echo "   📈 Tokens: $(echo $TOKENS | awk '{printf "%'"'"'d\n", $1}' 2>/dev/null || echo $TOKENS)"
        echo "   💰 Cost: \$$COST"
    else
        echo "⚠️  Update failed - will retry in 30 seconds"
    fi
    
    echo ""
    sleep 30
done