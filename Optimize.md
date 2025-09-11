# MediMate Malaysia – Security & Performance Optimization Plan

## Executive Summary
- Overall: Solid foundation with cultural features, Dockerized infra, and monitoring. Key risks are permissive defaults and exposed dev credentials in templates. Biggest perf wins are reducing N+1 DB calls and leveraging indexes/caching consistently.
- Top security fixes: tighten Redis/MinIO/Postgres defaults, restrict CORS, add auth to health dashboard, enforce secrets management, and enable DB row‑level security (RLS).
- Top performance fixes: batch prayer‑time lookups, add GIN/trigram indexes for array/text search, centralize caching TTLs, and add query/route‑level metrics to catch regressions.

## High‑Priority Security Risks Observed
- CORS wildcard in health API: `monitoring/health-check-api.js` defaults `CORS_ORIGIN='*'`.
- Redis exposed insecurely: `docker/redis/redis.conf` binds `0.0.0.0`, `protected-mode no`, no password.
- MinIO buckets public: `docker-compose.yml` init sets `mc policy set public` for all buckets.
- Dev credentials in `.env.example`: default passwords for Postgres, Redis, MinIO, pgAdmin, Grafana, JWT and encryption keys.
- Postgres roles with static passwords: `docker/postgres/init.sql` creates roles with predictable passwords.
- Missing RLS in DB: `docker/postgres/schema.sql` has RLS commented out for sensitive tables.
- Health dashboard unauthenticated: `monitoring/health-check-api.js` serves status endpoints with no auth and permissive CORS.
- Shell execution from API: health API spawns scripts; add timeouts/resource limits to reduce abuse.

## Security Hardening Plan
- CORS and health endpoints
  - Set `CORS_ORIGIN` to explicit origins; remove wildcard.
  - Add basic or token auth for health endpoints and dashboard; optionally IP whitelist.
  - Rate limit health endpoints and add request timeouts.
- Redis
  - Bind to internal network only; set `protected-mode yes`.
  - Set `requirepass`/ACL via env/secret; restrict commands; keep dangerous commands disabled.
  - Do not publish Redis ports in production Compose; only internal networks.
- MinIO/S3
  - Make buckets private by default; grant per‑bucket minimal policies.
  - Enforce server‑side encryption; rotate access keys; restrict console access in prod.
- Postgres
  - Use secrets/managed DB in prod; rotate passwords regularly.
  - Enable RLS for `users`, `medications`, `adherence_logs`, etc.; write policies per app role.
  - Separate least‑privilege roles (read, write, analytics); remove default passwords.
  - Require TLS between app and DB in prod.
- Secrets Management
  - Don’t use `.env` in prod; use Docker/Swarm/K8s secrets or cloud secret manager.
  - Validate presence/strength of secrets on boot; fail fast if defaults detected.
- Input Validation and AuthN/Z
  - Validate/sanitize all external parameters; use a schema validator at service boundaries.
  - Enforce JWT algorithm/length; short‑lived access token + refresh flow; scope API keys.
- Logging/Observability
  - Structured logging with PII/secrets redaction.
  - Security headers on web endpoints; CSP and HSTS when behind TLS.
  - Audit logging for access to sensitive routes/data (PDPA alignment).
- Container/CI
  - Add image and filesystem scans (Trivy/Grype), dependency scans (OSV/Snyk), and Semgrep in CI.
  - Enable Docker resource limits; pin image digests (avoid `latest`).

## Security Testing Plan
- Dependency/Code Scans
  - JS/TS: `npm audit --production` or `pnpm audit --prod`, `osv-scanner --lock package-lock.json`.
  - Static: `semgrep ci` with OWASP/JWT rulesets.
  - Containers/OS: `trivy fs .` and `trivy image` in CI for images.
- Config/Secret Hygiene
  - `git secrets --scan`, `detect-secrets scan`; guard in pre‑commit/CI.
  - Boot‑time guard to block default creds.
- Runtime and E2E
  - k6 or Locust against auth‑protected endpoints; verify rate limits and CORS.
  - ZAP/Burp baseline scan on public HTTP endpoints.
- DB
  - Verify RLS policies with explicit tests.
  - `pg_hba.conf` TLS enforcement; `sslmode=require` in connection string.

## Performance Opportunities Observed
- N+1 pattern in cultural scheduling
  - `CulturalDataService.getAppointmentSchedulingRecommendations`: inside loop calls `getPrayerTimes` and `isHoliday` per day. Pre‑fetch prayer times with `PrayerTime.findByCityRange` and reuse, and pre‑map holiday results from `findUpcoming` instead of per‑day lookups.
- Text/array searches without optimal indexes
  - `LocalMedication.searchByName` uses `iLike` and array ops; add GIN index on arrays and trigram index on `genericName` for fuzzy search.
- Caching strategy
  - Cache prayer times and holidays by `(cityKey, date)` and `(stateCode, month)` with Redis and well‑chosen TTLs; align keys to business semantics.
- Health API performance
  - Add child process timeouts and concurrency caps; avoid overlapping expensive script runs. Keep 30s cache but ensure cache keys include params.
- DB settings and query health
  - `pg_stat_statements` and slow query logging already configured; act on reports routinely.
  - Tune pool sizes from `.env.example` for prod; avoid connection storms.
- Node/HTTP layer
  - Enable gzip/brotli at reverse proxy; return compact JSON for health endpoints.
  - Add route‑level timing histograms (p50/p95/p99).
- Frontend/mobile
  - Prebundle translations (already mostly imported); avoid dynamic i18n fetches in RN.
  - Ensure asset caching headers and lazy‑load heavy components in the developer portal.

## Performance Optimization Plan
- Batch/Prefetch
  - Preload prayer times for `[startDate, startDate+days)` via `findByCityRange`.
  - Build a `Set` of holiday dates from `findUpcoming(days, stateCode)` once per request.
- Indexes
  - Add GIN on `brand_names` (array) for overlap/contains searches.
  - Add `pg_trgm` index on `generic_name` and optionally `therapeutic_class` for `iLike` filters.
  - Add composite indexes for common filters (e.g., halal + availability).
- Caching
  - Redis keys: `prayer:{city}:{date}` TTL 36h; `holiday:state:{yyyy-mm}` TTL 32d; medication search caches with short TTL.
  - Add cache stampede protection (singleflight/lock or jitter).
- Query and pool tuning
  - Start `DB_CONNECTION_POOL_MAX` ≈ CPUs×2; tune from metrics.
  - Use `EXPLAIN (ANALYZE, BUFFERS)` for queries > 500ms and optimize.
- Node runtime
  - Instrument key functions with timings; add `autocannon` smoke tests.
  - Handle unhandled rejections; keep process healthy.

## Concrete Changes Tied to Files
- `monitoring/health-check-api.js`
  - Restrict `CORS_ORIGIN`, add auth (header token), script timeouts, and a max concurrency semaphore; consider `helmet` and rate limiting if moving to Express.
- `docker/redis/redis.conf`
  - `bind 127.0.0.1` (or internal Docker network), `protected-mode yes`, enable auth/ACL, keep dangerous commands disabled; don’t publish port in prod.
- `docker-compose.yml`
  - Remove external port mapping for Redis/Postgres/MinIO in prod; use internal networks only.
  - Make MinIO buckets private; apply per‑bucket policies rather than `public`.
- `docker/postgres/init.sql` / `schema.sql`
  - Replace static passwords with secrets; enable RLS; add GIN/trigram indexes for medication/cultural search patterns; validate `ALTER SYSTEM` fits prod infra.
- `src/services/CulturalDataService.js`
  - Batch fetch via `findByCityRange`; precompute holiday map; memoize per request; optional Redis cache.

## Monitoring and SLOs
- SLOs: p95 endpoints < 200ms (cached) and < 600ms (uncached), error rate < 0.1%.
- Dashboards (Prometheus/Grafana):
  - Route latency p50/p95/p99, error rate, RPS
  - DB: TPS, slow queries, cache hit rate, pool saturation
  - Redis: memory, evictions, latency
  - Health API success/failure and script timing
- Alerts on SLO burn rate and resource saturation.

## Validation Steps (no code changes)
- Security
  - JS deps: `npm audit --omit=dev` or `pnpm audit --prod`
  - Semgrep: `semgrep ci` with OWASP/JWT rulesets
  - Containers: `trivy fs . && trivy image your-image:tag`
  - Secrets: `detect-secrets scan` and `git secrets --scan`
- Performance
  - Load: `npx autocannon http://localhost:8080/health`
  - DB: `SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 20;`
  - EXPLAIN: run `EXPLAIN (ANALYZE, BUFFERS)` on top queries found
- Caching
  - Verify TTLs and cardinality with `redis-cli --latency` and `INFO keyspace`

## Prioritized Roadmap
- Week 0–1 (Quick wins)
  - Lock down CORS/health endpoints; add timeouts; restrict ports in Compose for prod.
  - Turn on Redis protected mode and auth; make MinIO buckets private.
  - Replace default creds in all envs; CI guard for defaults.
- Week 2–3 (Core hardening + perf)
  - Implement RLS and least‑privilege roles; add missing DB indexes.
  - Batch/memoize cultural scheduling queries; add Redis caching.
  - Add observability (route/DB metrics) and perf tests.
- Week 4+ (Maturity)
  - Dependency/container scanning in CI with policy gates.
  - Token rotation, SSO for dashboards; secrets manager integration.
  - Capacity planning and SLO‑based alerting.

