.PHONY: help dev-up dev-down dev-logs dev-build prod-up prod-down prod-logs prod-build clean status

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)Docker Compose Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev-up          Start development environment"
	@echo "  make dev-down        Stop development environment"
	@echo "  make dev-logs        Show development logs"
	@echo "  make dev-build       Build development images"
	@echo "  make dev-shell       Open shell in backend (dev)"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make prod-up         Start production environment"
	@echo "  make prod-down       Stop production environment"
	@echo "  make prod-logs       Show production logs"
	@echo "  make prod-build      Build production images"
	@echo ""
	@echo "$(GREEN)General:$(NC)"
	@echo "  make status          Show service status"
	@echo "  make clean           Clean up all containers and volumes"
	@echo "  make help            Show this help message"

# Development commands
dev-up:
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"

dev-down:
	@echo "$(BLUE)Stopping development environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
	@echo "$(GREEN)✓ Development environment stopped$(NC)"

dev-logs:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

dev-build:
	@echo "$(BLUE)Building development images...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
	@echo "$(GREEN)✓ Build completed$(NC)"

dev-shell:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend sh

dev-ps:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

# Production commands
prod-up:
	@echo "$(BLUE)Starting production environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Production environment started$(NC)"

prod-down:
	@echo "$(BLUE)Stopping production environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Production environment stopped$(NC)"

prod-logs:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

prod-build:
	@echo "$(BLUE)Building production images...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
	@echo "$(GREEN)✓ Build completed$(NC)"

prod-shell:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend sh

prod-ps:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# General commands
status:
	@echo "$(BLUE)=== Development Status ===$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps 2>/dev/null || echo "Not running"
	@echo ""
	@echo "$(BLUE)=== Production Status ===$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps 2>/dev/null || echo "Not running"

clean:
	@echo "$(RED)⚠ This will remove all containers, networks, and volumes$(NC)"
	@read -p "Continue? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Cleaning up...$(NC)"; \
		docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v 2>/dev/null || true; \
		docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v 2>/dev/null || true; \
		echo "$(GREEN)✓ Cleanup completed$(NC)"; \
	else \
		echo "$(RED)Cleanup cancelled$(NC)"; \
	fi

# Utility commands
logs-backend:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

logs-db:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f db

logs-mqtt:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f mqtt

logs-web:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f web-dev

pull:
	@echo "$(BLUE)Pulling latest images...$(NC)"
	docker-compose pull
	@echo "$(GREEN)✓ Images pulled$(NC)"

validate:
	@echo "$(BLUE)Validating configuration...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml config > /dev/null && echo "$(GREEN)✓ Dev config is valid$(NC)" || echo "$(RED)✗ Dev config is invalid$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null && echo "$(GREEN)✓ Prod config is valid$(NC)" || echo "$(RED)✗ Prod config is invalid$(NC)"

