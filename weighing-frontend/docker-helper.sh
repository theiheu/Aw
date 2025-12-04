#!/bin/bash

# Docker Compose Helper Script
# Usage: ./docker-helper.sh [command] [environment]
# Example: ./docker-helper.sh up dev
#          ./docker-helper.sh logs prod backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${2:-dev}
COMMAND=${1:-help}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}Error: Environment must be 'dev' or 'prod'${NC}"
    exit 1
fi

# Docker Compose files
BASE_COMPOSE="docker-compose.yml"
ENV_COMPOSE="docker-compose.${ENVIRONMENT}.yml"

# Check if files exist
if [ ! -f "$BASE_COMPOSE" ]; then
    echo -e "${RED}Error: $BASE_COMPOSE not found${NC}"
    exit 1
fi

if [ ! -f "$ENV_COMPOSE" ]; then
    echo -e "${RED}Error: $ENV_COMPOSE not found${NC}"
    exit 1
fi

# Docker Compose command
DC="docker-compose -f $BASE_COMPOSE -f $ENV_COMPOSE"

# Functions
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Commands
case "$COMMAND" in
    up)
        print_header "Starting services ($ENVIRONMENT)"
        $DC up -d
        print_success "Services started"
        echo -e "\n${BLUE}Services:${NC}"
        $DC ps
        ;;

    down)
        print_header "Stopping services ($ENVIRONMENT)"
        $DC down
        print_success "Services stopped"
        ;;

    restart)
        print_header "Restarting services ($ENVIRONMENT)"
        $DC restart
        print_success "Services restarted"
        ;;

    logs)
        SERVICE=${3:-""}
        if [ -z "$SERVICE" ]; then
            print_header "Showing all logs ($ENVIRONMENT)"
            $DC logs -f --tail=100
        else
            print_header "Showing logs for $SERVICE ($ENVIRONMENT)"
            $DC logs -f --tail=100 "$SERVICE"
        fi
        ;;

    ps)
        print_header "Service status ($ENVIRONMENT)"
        $DC ps
        ;;

    build)
        SERVICE=${3:-""}
        if [ -z "$SERVICE" ]; then
            print_header "Building all services ($ENVIRONMENT)"
            $DC build
        else
            print_header "Building $SERVICE ($ENVIRONMENT)"
            $DC build "$SERVICE"
        fi
        print_success "Build completed"
        ;;

    pull)
        print_header "Pulling latest images ($ENVIRONMENT)"
        $DC pull
        print_success "Images pulled"
        ;;

    shell)
        SERVICE=${3:-backend}
        print_header "Opening shell in $SERVICE ($ENVIRONMENT)"
        $DC exec "$SERVICE" sh
        ;;

    exec)
        SERVICE=${3:-backend}
        COMMAND_TO_RUN=${4:-"sh"}
        print_header "Executing in $SERVICE ($ENVIRONMENT)"
        $DC exec "$SERVICE" $COMMAND_TO_RUN
        ;;

    clean)
        print_warning "This will remove containers, networks, and volumes"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_header "Cleaning up ($ENVIRONMENT)"
            $DC down -v
            print_success "Cleanup completed"
        else
            print_warning "Cleanup cancelled"
        fi
        ;;

    status)
        print_header "Detailed status ($ENVIRONMENT)"
        echo -e "\n${BLUE}Container Status:${NC}"
        $DC ps
        echo -e "\n${BLUE}Resource Usage:${NC}"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
            $(docker-compose -f $BASE_COMPOSE -f $ENV_COMPOSE ps -q) 2>/dev/null || echo "No containers running"
        ;;

    validate)
        print_header "Validating configuration ($ENVIRONMENT)"
        $DC config > /dev/null && print_success "Configuration is valid" || print_error "Configuration is invalid"
        ;;

    help|*)
        echo -e "${BLUE}Docker Compose Helper${NC}"
        echo ""
        echo "Usage: $0 [command] [environment] [service]"
        echo ""
        echo "Environments:"
        echo "  dev                Development environment (default)"
        echo "  prod               Production environment"
        echo ""
        echo "Commands:"
        echo "  up                 Start services"
        echo "  down               Stop services"
        echo "  restart            Restart services"
        echo "  logs [service]     Show logs (all or specific service)"
        echo "  ps                 Show service status"
        echo "  build [service]    Build images (all or specific service)"
        echo "  pull               Pull latest base images"
        echo "  shell [service]    Open shell in service (default: backend)"
        echo "  exec [service]     Execute command in service"
        echo "  clean              Remove containers, networks, and volumes"
        echo "  status             Show detailed status and resource usage"
        echo "  validate           Validate docker-compose configuration"
        echo "  help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 up dev                    # Start dev environment"
        echo "  $0 logs prod backend         # Show backend logs in prod"
        echo "  $0 shell dev                 # Open shell in backend (dev)"
        echo "  $0 build prod                # Build all images (prod)"
        echo "  $0 clean dev                 # Clean up dev environment"
        ;;
esac

