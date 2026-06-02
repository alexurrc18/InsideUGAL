# Structured Logging Standard — InsideUGAL

> Standardul de logging pentru toate echipele (Backend, Frontend, LLM).
> Implementarea este responsabilitatea echipelor BE și FE. Infrastructura oferă doar standardul.

## Schema JSON

Fiecare log trebuie să fie în format JSON cu următoarele câmpuri:

```json
{
  "timestamp": "2026-05-22T12:00:00Z",
  "level": "INFO",
  "correlation_id": "uuid-unic-per-request",
  "user_id": "uuid-utilizator-sau-null",
  "path": "/api/v1/cantina/meniu",
  "method": "GET",
  "status_code": 200,
  "duration_ms": 45,
  "service": "backend",
  "message": "Request procesat cu succes"
}
```

## Librării Recomandate

| Echipă | Librărie |
|--------|----------|
| Backend (FastAPI) | `structlog` |
| Frontend (Next.js) | `pino` |
| LLM | `structlog` |

## Instalare

**Backend:**
```bash
pip install structlog
```

**Frontend:**
```bash
npm install pino pino-pretty
```

## Nivele de Logging
- `DEBUG` — doar în development
- `INFO` — request-uri normale
- `WARNING` — erori recuperabile
- `ERROR` — erori critice

## Notă pentru echipe
Echipele BE (@andreeac25) și FE trebuie să implementeze acest standard.
PR-urile fără logging structurat nu vor fi aprobate după 01.06.2026.