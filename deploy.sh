#!/bin/bash
# Nexus v2 - Automated Production Setup & Deployment
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Nexus v2 - Production Deployment Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "${BLUE}Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo "${RED}✗ Git not found. Please install Git.${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "${RED}✗ pnpm not found. Please install pnpm: npm install -g pnpm${NC}"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "${RED}✗ npx not found. Please install Node.js${NC}"
    exit 1
fi

echo "${GREEN}✓ All prerequisites found${NC}"
echo ""

# Step 1: Install dependencies
echo "${BLUE}Step 1: Installing dependencies...${NC}"
pnpm install --frozen-lockfile
echo "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Type checking
echo "${BLUE}Step 2: Running type checks...${NC}"
pnpm type-check
if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Type checks passed${NC}"
else
    echo "${RED}✗ Type check failed${NC}"
    exit 1
fi
echo ""

# Step 3: Build frontend & backend
echo "${BLUE}Step 3: Building frontend and backend...${NC}"
pnpm build
echo "${GREEN}✓ Build successful${NC}"
echo ""

# Step 4: Git setup
echo "${BLUE}Step 4: Git repository setup${NC}"

if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git config user.email "nexus@wolfethyst.tv"
    git config user.name "Nexus Bot"
    echo "${GREEN}✓ Git repository initialized${NC}"
else
    echo "${GREEN}✓ Git repository already initialized${NC}"
fi

if ! git remote get-url origin &> /dev/null; then
    echo "${YELLOW}⚠ No remote 'origin' found${NC}"
    echo "Please set your GitHub repository:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/nexus-v2.git"
    echo ""
    read -p "Enter your GitHub repository URL (or press Enter to skip): " github_repo
    if [ ! -z "$github_repo" ]; then
        git remote add origin "$github_repo"
        echo "${GREEN}✓ Remote added${NC}"
    fi
else
    echo "${GREEN}✓ Remote 'origin' already set${NC}"
    git remote get-url origin
fi
echo ""

# Step 5: Prepare git
echo "${BLUE}Step 5: Preparing files for commit${NC}"
git add .
echo "${GREEN}✓ Files staged${NC}"
echo ""

# Step 6: Show commit status
echo "${BLUE}Step 6: Commit status${NC}"
echo "Files to commit:"
git diff --cached --name-status | head -20
echo ""

# Step 7: Commit
echo -n "${YELLOW}Ready to commit? (y/n): ${NC}"
read -r confirm
if [ "$confirm" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

git commit -m "chore: initial monorepo setup - React frontend + Cloudflare Workers backend"
echo "${GREEN}✓ Committed${NC}"
echo ""

# Step 8: Check for Cloudflare secrets
echo "${BLUE}Step 7: Cloudflare Configuration${NC}"
echo ""
echo "GitHub Actions needs these secrets to deploy:"
echo "  1. CLOUDFLARE_API_TOKEN"
echo "  2. CLOUDFLARE_ACCOUNT_ID"
echo ""
echo "To set these up:"
echo "  1. Go to: https://github.com/YOUR_USERNAME/nexus-v2/settings/secrets/actions"
echo "  2. Click 'New repository secret'"
echo "  3. Add CLOUDFLARE_API_TOKEN with your token"
echo "  4. Add CLOUDFLARE_ACCOUNT_ID with your account ID"
echo ""
read -p "Have you added these secrets? (y/n): " secrets_added
if [ "$secrets_added" != "y" ]; then
    echo "${YELLOW}⚠ Skipping deployment without secrets${NC}"
    echo "Add the secrets and run: git push origin main"
    exit 0
fi
echo ""

# Step 8: Push to GitHub
echo "${BLUE}Step 8: Pushing to GitHub${NC}"
if ! git remote get-url origin &> /dev/null || [ -z "$(git remote get-url origin)" ]; then
    echo "${RED}✗ No remote repository configured${NC}"
    echo "Please set your GitHub repo first:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/nexus-v2.git"
    exit 1
fi

git push -u origin main --force
echo "${GREEN}✓ Pushed to GitHub${NC}"
echo ""

# Step 9: Success!
echo "${BLUE}Step 9: Deployment Status${NC}"
echo ""
echo "${GREEN}✓ Production deployment initiated!${NC}"
echo ""
echo "What's happening now:"
echo "  1. GitHub Actions workflows are running"
echo "  2. Type checks in progress..."
echo "  3. Frontend building for Cloudflare Pages..."
echo "  4. Backend building for Cloudflare Workers..."
echo "  5. Both deploying automatically..."
echo ""
echo "Check deployment status:"
echo "  1. GitHub Actions: https://github.com/YOUR_USERNAME/nexus-v2/actions"
echo "  2. Cloudflare Dashboard: https://dash.cloudflare.com"
echo "  3. Workers: https://dash.cloudflare.com/workers-and-pages"
echo "  4. Pages: https://dash.cloudflare.com/pages"
echo ""
echo "Estimated time to live: 2-3 minutes"
echo "${GREEN}Done!${NC}"
