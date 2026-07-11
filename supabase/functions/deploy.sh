#!/bin/bash

# Multi-Device Tracking Edge Functions Deployment Script
# This script deploys both Edge Functions and sets up environment secrets

set -e

echo "🚀 Deploying Multi-Device Tracking Edge Functions..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠${NC}  Project not linked to Supabase"
    echo "Run: supabase link --project-ref your-project-ref"
    exit 1
fi

echo -e "${GREEN}✓${NC} Project is linked"
echo ""

# Deploy Edge Functions
echo "📦 Deploying Edge Functions..."
echo ""

echo "Deploying list-user-sessions..."
supabase functions deploy list-user-sessions

echo ""
echo "Deploying revoke-session..."
supabase functions deploy revoke-session

echo ""
echo -e "${GREEN}✅ Edge Functions deployed successfully!${NC}"
echo ""

# Check if secrets are set
echo "🔐 Checking environment secrets..."
echo ""

# Prompt for secrets if needed
read -p "Do you want to set/update environment secrets now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please enter your Supabase credentials:"
    echo "(Find them in: Supabase Dashboard → Settings → API)"
    echo ""
    
    read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    read -sp "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
    echo ""
    echo ""
    
    echo "Setting secrets..."
    supabase secrets set SUPABASE_URL="$SUPABASE_URL"
    supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
    
    echo ""
    echo -e "${GREEN}✅ Secrets set successfully!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠${NC}  Skipping secrets setup"
    echo "You can set them manually with:"
    echo "  supabase secrets set SUPABASE_URL=your-url"
    echo "  supabase secrets set SUPABASE_ANON_KEY=your-key"
    echo "  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Test the functions with curl (see DEPLOYMENT.md)"
echo "  2. Open your app and navigate to Profile → Manage Devices"
echo "  3. Verify you can see all active sessions"
echo "  4. Try removing a device"
echo ""
echo "To view logs:"
echo "  supabase functions logs list-user-sessions --follow"
echo "  supabase functions logs revoke-session --follow"
echo ""
echo "For troubleshooting, see: supabase/functions/DEPLOYMENT.md"
echo ""
























