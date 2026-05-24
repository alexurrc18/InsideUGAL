# InsideUGAL Deploy Runbook

Acest document acopera doar deploy, retea, secrete, monitorizare si backup.

## 1. CI obligatoriu

Workflow: `.github/workflows/ci.yml`.

Pe fiecare Pull Request ruleaza:

- Frontend Next.js: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Backend FastAPI: detecteaza `Backend/` sau `backend/`, instaleaza dependintele, ruleaza `ruff`, `mypy` si `python -m compileall`.

Daca backend-ul nu exista inca pe branch-ul curent, jobul `Backend` esueaza explicit. Dupa ce backend-ul FastAPI intra in `main`, instalati `ruff` si `mypy` in dependintele de development si faceti jobul required in branch protection.

## 2. Reverse proxy si retea Docker

Regula: public se expun doar `frontend` si `backend`.

- `frontend` si `backend`: atasate la reteaua Traefik/Coolify si la reteaua interna.
- Supabase/Postgres si LLM: atasate doar la reteaua interna Docker.
- Nu se publica porturi directe pentru Supabase/Postgres/LLM.

`docker-compose.yaml` elimina publicarea directa a portului frontend si foloseste Traefik labels. In Coolify, setati:

- `FRONTEND_HOST`
- `TRAEFIK_NETWORK`
- `TRAEFIK_ENTRYPOINT`
- `TRAEFIK_CERT_RESOLVER`

Verificare interna dupa ce exista serviciul Supabase in compose:

```bash
docker compose exec frontend curl -fsS http://supabase:8000
```

Verificare externa:

```bash
curl -I https://$FRONTEND_HOST
curl -I https://$BACKEND_HOST/health
```

Supabase si LLM nu trebuie sa raspunda direct din exterior.

## 3. Health checks

Fiecare serviciu din `docker-compose.yaml` trebuie sa aiba:

- `test`
- `interval`
- `timeout`
- `retries`
- `start_period`

Frontend are healthcheck pe `http://127.0.0.1:3000/`. Cand se adauga backend, Supabase sau LLM in compose, adaugati healthcheck in acelasi stil.

## 4. Secrets management

`.env.example` contine doar numele variabilelor. Valorile reale se seteaza local in `.env` sau in Coolify UI.

Reguli:

- Nu comitati `.env`.
- Nu comitati chei API, parole, service role keys sau dump-uri cu date reale.
- `SUPABASE_SERVICE_ROLE_KEY` se foloseste doar server-side.

Audit rapid:

```bash
rg -n -i "password|api[_-]?key|secret|SUPABASE_SERVICE_KEY|OPENAI_API_KEY|GEMINI_API_KEY|\.env" .
git log -p --all | grep -iE "key|secret|password|SUPABASE_SERVICE_KEY|OPENAI_API_KEY|GEMINI_API_KEY|\.env"
```

Rezultat audit local: istoricul Git contine o cheie reala `GEMINI_API_KEY` in `LLM/modul-deadlines/.env`. Rotiti cheia imediat din provider si curatati istoricul cu `git filter-repo` sau BFG Repo-Cleaner.

## 5. Deploy pe server nou

1. Instalati Docker pe server.
2. Instalati Coolify.
3. Conectati repository-ul GitHub in Coolify.
4. Creati aplicatia din `docker-compose.yaml`.
5. Setati variabilele din `.env.example` in Coolify UI.
6. Configurati domeniile in DNS/AdGuard:
   - `FRONTEND_HOST` catre IP-ul serverului.
   - `BACKEND_HOST` catre IP-ul serverului cand backend-ul exista.
7. Rulati deploy.
8. Verificati healthcheck-urile in Coolify.
9. Verificati ca doar frontend/backend sunt accesibile public.

## 6. Uptime Kuma

Creati monitoare cu alerta la down mai mult de 2 minute:

- Frontend: `https://$FRONTEND_HOST`
- Backend: `https://$BACKEND_HOST/health`
- Supabase: monitor intern sau endpoint securizat, fara expunere publica directa.

Configurati cel putin un canal de alerta: email, Telegram sau Discord. Testati alerta dupa configurare.

## 7. Backup Postgres

Configurati backup automat Postgres in Coolify:

- cron zilnic
- retentie rolling 7 zile
- locatie backup conform infrastructurii Coolify

Test restaurare:

1. Restaurati cel mai recent backup intr-o baza temporara.
2. Verificati ca migrarile si datele critice sunt prezente.
3. Notati data testului si rezultatul.

Backup netestat = backup inexistent.
