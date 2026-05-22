# Contributing to InsideUGAL

## Setup Mediu Local

### Pre-commit Hooks

Pre-commit hooks verifică automat codul înainte de fiecare commit (linting, formatting, secrets).

**Instalare:**

```bash
pip install pre-commit
pre-commit install
```

**Verificare manuală:**
```bash
pre-commit run --all-files
```

### Ce verifică hooks-urile:
- **ruff** — linting și formatting Python
- **eslint + prettier** — linting și formatting JavaScript/TypeScript
- **sqlfluff** — linting SQL (dialect PostgreSQL)
- **gitleaks** — detectare secrete/parole în cod

> ⚠️ Niciun commit nu va fi acceptat dacă hooks-urile eșuează.

## Git Workflow

1. Creează branch din `Infrastructura`: `git checkout -b nume-branch`
2. Lucrează, commit, push
3. Deschide Pull Request către `Infrastructura`
4. Necesită minim 1 review înainte de merge
5. CI/CD trebuie să treacă ✅