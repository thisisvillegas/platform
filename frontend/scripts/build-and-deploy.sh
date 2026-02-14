#!/bin/bash
#
# Platform Frontend - Build & Deploy Script
#
# Builds Angular frontend locally on Mac and deploys to Raspberry Pi.
#
# Usage:
#   cd /Users/andres/dev/platform/frontend
#   ./scripts/build-and-deploy.sh
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PI_HOST="192.168.0.95"
PI_USER="remus"
PI_SSH_KEY="$HOME/.ssh/id_ed25519_pi"
PI_APP_PATH="/home/remus/apps/platform/frontend"
LOCAL_FRONTEND_PATH="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${YELLOW}=== Platform Frontend Build & Deploy ===${NC}"

echo -e "${GREEN}[1/5] Cleaning Angular cache...${NC}"
cd "$LOCAL_FRONTEND_PATH"
rm -rf .angular/cache

echo -e "${GREEN}[2/5] Building production bundle...${NC}"
npx ng build --configuration production

echo -e "${GREEN}[3/5] Validating build output...${NC}"
if [ ! -f "dist/frontend/browser/index.html" ]; then
  echo -e "${RED}ERROR: dist/frontend/browser/index.html not found. Build failed.${NC}"
  exit 1
fi

echo -e "${YELLOW}Build size:${NC}"
du -sh dist/frontend/browser

echo -e "${GREEN}[4/5] Deploying to Pi...${NC}"
ssh -i "$PI_SSH_KEY" "$PI_USER@$PI_HOST" "pm2 stop platform-frontend || true"
ssh -i "$PI_SSH_KEY" "$PI_USER@$PI_HOST" "cd $PI_APP_PATH && rm -rf dist.backup && mv dist dist.backup || true"
scp -i "$PI_SSH_KEY" -r dist/frontend/browser "$PI_USER@$PI_HOST:$PI_APP_PATH/dist"

echo -e "${GREEN}[5/5] Restarting service...${NC}"
ssh -i "$PI_SSH_KEY" "$PI_USER@$PI_HOST" "pm2 restart platform-frontend"
ssh -i "$PI_SSH_KEY" "$PI_USER@$PI_HOST" "pm2 status platform-frontend"

echo -e "${GREEN}=== Deploy complete! ===${NC}"
echo -e "${YELLOW}Frontend: https://thisisvillegas.com${NC}"
echo -e "${YELLOW}Game:     https://thisisvillegas.com/world${NC}"
