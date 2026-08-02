# ================================================
# Solitaire - Makefile
# One command for everything.
# ================================================

.PHONY: help setup dev build preview test lint format docker-build docker-run clean vercel

# Default target
help:
	@echo "Solitaire - Available commands:"
	@echo ""
	@echo "  make setup          → Full initial setup (Vite + deps)"
	@echo "  make dev            → Start local development server (hot reload)"
	@echo "  make build          → Production build"
	@echo "  make preview        → Preview production build locally"
	@echo "  make test           → Run all tests"
	@echo "  make lint           → Run ESLint"
	@echo "  make format         → Run Prettier"
	@echo "  make docker-build   → Build production Docker image"
	@echo "  make docker-run     → Run production Docker container (port 8080)"
	@echo "  make clean          → Remove build artifacts and node_modules"
	@echo "  make vercel         → Deploy to Vercel (requires Vercel CLI)"
	@echo ""
	@echo "All commands automatically cd into ./frontend"

# Detect if we're in devcontainer (workspace root)
FRONTEND_DIR := ./frontend

# Setup - runs only if needed
setup:
	@echo "🚀 Setting up Solitaire..."
	@mkdir -p $(FRONTEND_DIR)
	@cd $(FRONTEND_DIR) && \
		(if [ ! -f package.json ]; then \
			echo "→ Creating new Vite React + TypeScript app..."; \
			npx create-vite@latest . --template react-ts --yes; \
		fi) && \
		echo "→ Installing dependencies..." && \
		npm install && \
		echo "✅ Setup complete! Run 'make dev' to start developing."

# Development
dev:
	@cd $(FRONTEND_DIR) && npm run dev

# Production build
build:
	@cd $(FRONTEND_DIR) && npm run build
	@echo "✅ Production build complete → ./frontend/dist"

# Preview production build locally
preview:
	@cd $(FRONTEND_DIR) && npm run preview

# Tests
test:
	@cd $(FRONTEND_DIR) && npm test

# Code quality
lint:
	@cd $(FRONTEND_DIR) && npm run lint

format:
	@cd $(FRONTEND_DIR) && npm run format

# Production Docker
docker-build:
	@cd $(FRONTEND_DIR) && docker build -t solitaire .
	@echo "✅ Docker image built: solitaire"

docker-run:
	@cd $(FRONTEND_DIR) && docker run --rm -p 8080:80 solitaire
	@echo "🌐 Production app running at http://localhost:8080"

# Cleanup
clean:
	@rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/node_modules
	@echo "🧹 Cleaned build artifacts and node_modules"

# Vercel deployment (requires Vercel CLI installed)
vercel:
	@echo "🚀 Deploying to Vercel..."
	@cd $(FRONTEND_DIR) && npx vercel --prod

# Quick alias for common workflow
all: setup build test
	@echo "✅ Full pipeline complete!"

# Make sure the frontend folder exists
$(FRONTEND_DIR):
	@mkdir -p $(FRONTEND_DIR)
