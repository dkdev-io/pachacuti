#!/bin/bash

# Quick Supabase Setup for Pachacuti Session Recorder
# Run this after you've extracted your Supabase credentials

echo "🚀 Quick Supabase Integration Setup"
echo ""

# Check if credentials exist
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Creating template..."
    cat > .env << EOL
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_PROJECT_ID=your_project_id_here

# Existing configuration
NODE_ENV=development
LOG_LEVEL=info
SESSION_RECORDER_PORT=5555
EOL
    echo "📝 Please edit .env with your Supabase credentials"
    echo "   1. Go to your Supabase project settings"
    echo "   2. Navigate to API section"
    echo "   3. Copy URL and anon key to .env"
    echo "   4. Run this script again"
    exit 0
fi

# Check if Supabase variables are set
if grep -q "your_supabase_url_here" .env; then
    echo "⚠️  Please update .env with your actual Supabase credentials"
    echo "   Edit the SUPABASE_URL and SUPABASE_ANON_KEY values"
    exit 1
fi

echo "✅ Supabase credentials found in .env"

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Test Supabase connection
echo "🧪 Testing Supabase connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

supabase.from('_test').select('*').limit(1)
  .then(({ error }) => {
    if (error && !error.message.includes('does not exist')) {
      console.log('❌ Connection failed:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Supabase connection successful!');
    }
  })
  .catch(err => {
    console.log('❌ Connection error:', err.message);
    process.exit(1);
  });
"

echo ""
echo "📄 Next steps:"
echo "1. Run the SQL schema in your Supabase SQL editor:"
echo "   File: sql/supabase-schema.sql"
echo "   URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql"
echo ""
echo "2. Migrate your existing data:"
echo "   npm run migrate-to-supabase"
echo ""
echo "3. Start the cloud-powered recorder:"
echo "   npm run start-cloud"
echo ""
echo "4. View team dashboard:"
echo "   npm run dashboard"
echo ""
echo "🎉 Ready for Supabase integration!"