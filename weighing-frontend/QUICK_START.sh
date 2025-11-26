#!/bin/bash

# 🚀 Quick Start Script for Truck Weighing Station App
# This script automates the setup process

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Truck Weighing Station App - Quick Start Setup          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js >= 18.17.0"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm >= 9.0.0"
    exit 1
fi
print_success "npm $(npm --version) found"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') found"
else
    print_warning "Docker is not installed. You can still run frontend locally."
fi

# Check Docker Compose (optional)
if command -v docker-compose &> /dev/null; then
    print_success "Docker Compose $(docker-compose --version | cut -d' ' -f3 | tr -d ',') found"
else
    print_warning "Docker Compose is not installed. You'll need it for full setup."
fi

echo ""
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed"

echo ""
print_status "Checking configuration files..."

# Check if config files exist
if [ ! -f "config/backend.env" ]; then
    print_error "config/backend.env not found"
    exit 1
fi
print_success "config/backend.env found"

if [ ! -f "config/web.env" ]; then
    print_error "config/web.env not found"
    exit 1
fi
print_success "config/web.env found"

if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found"
    exit 1
fi
print_success "docker-compose.yml found"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

print_status "Choose how to start the application:"
echo ""
echo "  ${BLUE}Option 1: Full Docker Setup (Recommended)${NC}"
echo "    docker-compose up -d"
echo "    Then access: http://localhost"
echo ""
echo "  ${BLUE}Option 2: Frontend Local + Backend Docker${NC}"
echo "    docker-compose up -d mqtt db backend"
echo "    npm run dev"
echo "    Then access: http://localhost:5173"
echo ""
echo "  ${BLUE}Option 3: Frontend Dev Only${NC}"
echo "    npm run dev"
echo "    Then access: http://localhost:5173"
echo ""

print_status "Useful commands:"
echo "  npm run dev          - Start dev server"
echo "  npm run build        - Build for production"
echo "  npm run lint         - Check code quality"
echo "  npm run format       - Format code"
echo "  docker-compose logs -f  - View all logs"
echo ""

print_success "Setup complete! Choose an option above to start."


