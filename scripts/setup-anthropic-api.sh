#!/bin/bash

# Setup Anthropic API for REAL token usage tracking
# NO FAKE DATA ALLOWED

echo "🔐 Anthropic API Setup for Real Token Tracking"
echo "=============================================="
echo ""
echo "⚠️  IMPORTANT: This dashboard will ONLY show real data"
echo "   - NO mock data or estimations"
echo "   - Requires actual Anthropic API access"
echo "   - Shows 'Data unavailable' if no API key"
echo ""

# Check if API key is already set
if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY is already set"
    echo "   Current key: ${ANTHROPIC_API_KEY:0:10}..."
    echo ""
    read -p "Do you want to update it? (y/n): " update_key
    if [ "$update_key" != "y" ]; then
        echo "Keeping existing key."
        exit 0
    fi
fi

echo "To get your Anthropic API key:"
echo "1. Go to https://console.anthropic.com/settings/keys"
echo "2. Create or copy an API key"
echo "3. Paste it here"
echo ""

read -s -p "Enter your Anthropic API key: " api_key
echo ""

if [ -z "$api_key" ]; then
    echo "❌ No API key provided"
    echo "Token usage will show as 'Data unavailable' in dashboard"
    exit 1
fi

# Add to shell profile
echo "" >> ~/.bashrc
echo "# Anthropic API for real token tracking" >> ~/.bashrc
echo "export ANTHROPIC_API_KEY='$api_key'" >> ~/.bashrc

echo "" >> ~/.zshrc
echo "# Anthropic API for real token tracking" >> ~/.zshrc
echo "export ANTHROPIC_API_KEY='$api_key'" >> ~/.zshrc

# Export for current session
export ANTHROPIC_API_KEY="$api_key"

echo "✅ API key configured successfully"
echo ""
echo "Testing connection..."

# Test the API key (when Anthropic releases billing API)
node -e "
console.log('Note: Anthropic billing API is not yet public.');
console.log('Your usage data must be viewed at:');
console.log('https://console.anthropic.com/settings/usage');
console.log('');
console.log('Dashboard will show:');
console.log('- Real git statistics ✅');
console.log('- Real shell monitoring ✅');
console.log('- Token usage: Manual check required ⚠️');
"

echo ""
echo "Setup complete! Restart your terminal or run:"
echo "  source ~/.bashrc  (or ~/.zshrc)"
echo ""
echo "📊 View real usage at: https://console.anthropic.com/settings/usage"