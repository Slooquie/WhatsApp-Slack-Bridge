#!/bin/bash

# WhatsApp-Slack Bridge - Quick Setup Script for Linux
# This script automates the deployment process on a fresh Linux server

set -e  # Exit on error

echo "=================================="
echo "WhatsApp-Slack Bridge Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "This script is designed for Linux. Please run it on your Linux server."
    exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}Node.js installed successfully${NC}"
else
    echo -e "${GREEN}Node.js already installed: $(node --version)${NC}"
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}PM2 installed successfully${NC}"
else
    echo -e "${GREEN}PM2 already installed${NC}"
fi

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "Installing dependencies..."

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install
cd ..
echo -e "${GREEN}Backend dependencies installed${NC}"

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}Frontend dependencies installed${NC}"

# Create .env.local from template if it doesn't exist
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local from template...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}Please edit frontend/.env.local with your server's IP/domain${NC}"
fi

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build
echo -e "${GREEN}Frontend built successfully${NC}"
cd ..

# Start backend with PM2
echo -e "${YELLOW}Starting backend with PM2...${NC}"
cd backend
pm2 delete whatsapp-bridge 2>/dev/null || true  # Delete if exists
pm2 start server.js --name whatsapp-bridge
pm2 save
echo -e "${GREEN}Backend started successfully${NC}"

cd ..

echo ""
echo "=================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Backend is running on port 3000"
echo "Frontend build is in: frontend/dist/"
echo ""
echo "Next steps:"
echo "1. Configure frontend/.env.local with your server details"
echo "2. Set up Nginx to serve the frontend (see DEPLOYMENT.md)"
echo "3. Configure firewall: sudo ufw allow 3000"
echo "4. Access the application and configure Slack tokens"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check backend status"
echo "  pm2 logs whatsapp-bridge - View backend logs"
echo "  pm2 restart whatsapp-bridge - Restart backend"
echo ""
echo "For full deployment guide, see DEPLOYMENT.md"
echo ""
