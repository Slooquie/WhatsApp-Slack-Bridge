#!/bin/bash

#############################################
# WhatsApp-Slack Bridge - One-Click Installer
# Automated installation script for Linux
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  WhatsApp-Slack Bridge - One-Click Installer  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "This script is designed for Linux. Detected: $OSTYPE"
    exit 1
fi

print_header

# Check for root/sudo
if [ "$EUID" -eq 0 ]; then 
    print_warning "Please don't run as root. The script will use sudo when needed."
    exit 1
fi

# Detect package manager
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt-get"
    PKG_UPDATE="sudo apt-get update"
    PKG_INSTALL="sudo apt-get install -y"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    PKG_UPDATE="sudo yum check-update || true"
    PKG_INSTALL="sudo yum install -y"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    PKG_UPDATE="sudo dnf check-update || true"
    PKG_INSTALL="sudo dnf install -y"
else
    print_error "Unsupported package manager. Please install manually."
    exit 1
fi

print_info "Detected package manager: $PKG_MANAGER"
echo ""

# Update package list
print_info "Updating package list..."
$PKG_UPDATE > /dev/null 2>&1
print_success "Package list updated"

# Install curl and git if not present
print_info "Checking for required tools..."
for tool in curl git; do
    if ! command -v $tool &> /dev/null; then
        print_info "Installing $tool..."
        $PKG_INSTALL $tool > /dev/null 2>&1
        print_success "$tool installed"
    else
        print_success "$tool already installed"
    fi
done

# Check Node.js version
print_info "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_warning "Node.js $NODE_VERSION detected. Upgrading to Node.js 20..."
        INSTALL_NODE=true
    else
        print_success "Node.js $(node -v) detected"
        INSTALL_NODE=false
    fi
else
    print_warning "Node.js not found. Installing Node.js 20..."
    INSTALL_NODE=true
fi

# Install Node.js 20 if needed
if [ "$INSTALL_NODE" = true ]; then
    print_info "Installing Node.js 20 LTS..."
    
    if [ "$PKG_MANAGER" = "apt-get" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
        $PKG_INSTALL nodejs > /dev/null 2>&1
    elif [ "$PKG_MANAGER" = "yum" ] || [ "$PKG_MANAGER" = "dnf" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - > /dev/null 2>&1
        $PKG_INSTALL nodejs > /dev/null 2>&1
    fi
    
    print_success "Node.js $(node -v) installed"
fi

# Install PM2 if not present
print_info "Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    sudo npm install -g pm2 > /dev/null 2>&1
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Clone or update repository
print_info "Setting up WhatsApp-Slack Bridge..."
INSTALL_DIR="$HOME/WhatsApp-Slack-Bridge"

if [ -d "$INSTALL_DIR" ]; then
    print_warning "Directory already exists. Updating..."
    cd "$INSTALL_DIR"
    git pull > /dev/null 2>&1
    print_success "Repository updated"
else
    print_info "Cloning repository..."
    git clone https://github.com/Slooquie/WhatsApp-Slack-Bridge.git "$INSTALL_DIR" > /dev/null 2>&1
    cd "$INSTALL_DIR"
    print_success "Repository cloned"
fi

# Install backend dependencies
print_info "Installing backend dependencies..."
cd "$INSTALL_DIR/backend"
npm install > /dev/null 2>&1
print_success "Backend dependencies installed"

# Install frontend dependencies
print_info "Installing frontend dependencies..."
cd "$INSTALL_DIR/frontend"
npm install > /dev/null 2>&1
print_success "Frontend dependencies installed"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    print_info "Creating frontend configuration..."
    echo "VITE_API_URL=http://localhost:8080" > .env.local
    print_success "Frontend configuration created"
fi

# Build frontend
print_info "Building frontend..."
npm run build > /dev/null 2>&1
print_success "Frontend built successfully"

# Start backend with PM2
print_info "Starting backend with PM2..."
cd "$INSTALL_DIR/backend"
pm2 delete whatsapp-bridge 2>/dev/null || true
pm2 start server.js --name whatsapp-bridge > /dev/null 2>&1
pm2 save > /dev/null 2>&1
print_success "Backend started"

# Setup PM2 startup script
print_info "Configuring PM2 to start on boot..."
PM2_STARTUP=$(pm2 startup | grep "sudo" | tail -1)
if [ ! -z "$PM2_STARTUP" ]; then
    eval $PM2_STARTUP > /dev/null 2>&1
    print_success "PM2 startup configured"
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Installation Complete! 🎉             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Installation Directory:${NC} $INSTALL_DIR"
echo -e "${BLUE}Backend Status:${NC} Running on port 8080"
echo -e "${BLUE}Frontend Build:${NC} $INSTALL_DIR/frontend/dist/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "1. ${BLUE}Serve the frontend:${NC}"
echo -e "   cd $INSTALL_DIR/frontend/dist"
echo -e "   npx http-server -p 5173"
echo ""
echo -e "2. ${BLUE}Access the application:${NC}"
echo -e "   http://$SERVER_IP:5173"
echo -e "   or"
echo -e "   http://localhost:5173"
echo ""
echo -e "3. ${BLUE}Configure Slack tokens in the web interface${NC}"
echo ""
echo -e "4. ${BLUE}Scan WhatsApp QR code${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  ${BLUE}pm2 status${NC}              - Check backend status"
echo -e "  ${BLUE}pm2 logs whatsapp-bridge${NC} - View backend logs"
echo -e "  ${BLUE}pm2 restart whatsapp-bridge${NC} - Restart backend"
echo -e "  ${BLUE}pm2 stop whatsapp-bridge${NC} - Stop backend"
echo ""
echo -e "${GREEN}Star the project:${NC} https://github.com/Slooquie/WhatsApp-Slack-Bridge"
echo ""
