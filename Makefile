.PHONY: dev build start lint typecheck test check

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

check: lint typecheck test
	@echo "All frontend checks (lint, typecheck, test) passed!"
