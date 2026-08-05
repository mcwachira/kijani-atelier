include .env
export

COMPOSE=docker compose -f docker-compose.yml

.PHONY: build up down down-v restart ps logs \
        logs-app logs-nginx logs-db logs-redis logs-mail \
        shell composer-install artisan migrate fresh seed documentation tinker queue cache-clear \
        db db-reset db-test-create \
        test \
        web-install web-dev web-build web-start \
        dev

# ========================
# Docker Core
# ========================
build:
	$(COMPOSE) up --build -d --remove-orphans

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

down-v:
	$(COMPOSE) down -v

restart:
	$(COMPOSE) down && $(COMPOSE) up -d

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

# ========================
# Service Logs
# ========================
logs-app:
	$(COMPOSE) logs -f app

logs-nginx:
	$(COMPOSE) logs -f nginx

logs-db:
	$(COMPOSE) logs -f postgres

logs-redis:
	$(COMPOSE) logs -f redis

logs-mail:
	$(COMPOSE) logs -f mailpit

# ========================
# Backend (Laravel)
# ========================
shell:
	$(COMPOSE) exec app bash

composer-install:
	$(COMPOSE) exec app composer install

artisan:
	$(COMPOSE) exec app php artisan

migrate:
	$(COMPOSE) exec app php artisan migrate

fresh:
	$(COMPOSE) exec app php artisan migrate:fresh --seed

seed:
	$(COMPOSE) exec app php artisan db:seed

documentation:
	$(COMPOSE) exec app php artisan scribe:generate

tinker:
	$(COMPOSE) exec app php artisan tinker

queue:
	$(COMPOSE) exec app php artisan queue:work

cache-clear:
	$(COMPOSE) exec app php artisan optimize:clear

# ========================
# Testing
# ========================
# Runs the Pest suite against apps/backend/.env.testing (kijani_testing db,
# array mailer — never touches your real dev database or sends real email).
test:
	$(COMPOSE) exec app php artisan test --env=testing

# ========================
# Database
# ========================
db:
	$(COMPOSE) exec postgres psql -U $$DB_USERNAME -d $$DB_DATABASE

db-reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d
	sleep 3
	$(COMPOSE) exec app php artisan migrate:fresh --seed

# Creates the SEPARATE test database (kijani_testing) that .env.testing
# points at. Safe to run repeatedly — checks whether it already exists
# before attempting CREATE DATABASE, so it won't error on a second run.
db-test-create:
	@$(COMPOSE) exec postgres psql -U $$DB_USERNAME -lqt | cut -d '|' -f 1 | grep -qw kijani_testing || \
		$(COMPOSE) exec postgres psql -U $$DB_USERNAME -d postgres -c "CREATE DATABASE kijani_testing;"

# ========================
# Frontend (Local Only)
# ========================
web-install:
	cd apps/frontend && pnpm install

web-dev:
	cd apps/frontend && pnpm run dev

web-build:
	cd apps/frontend && pnpm run build

web-start:
	cd apps/frontend && pnpm run start

# ========================
# Full Dev Workflow
# ========================
dev:
	make up
	make web-dev