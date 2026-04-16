# Deploy and Monitoring Playbook

This playbook describes how to enable automated Render deploys, tune alert thresholds, and use the admin ops dashboard.

## 1) Enable CD deploy automation (Render)

Workflow: `.github/workflows/deploy-render.yml`

Configure these GitHub repository secrets:

- `RENDER_BACKEND_DEPLOY_HOOK_DEVELOPMENT`
- `RENDER_REDIRECT_DEPLOY_HOOK_DEVELOPMENT`
- `RENDER_BACKEND_HEALTHCHECK_URL_DEVELOPMENT`
- `RENDER_BACKEND_DEPLOY_HOOK_PRODUCTION`
- `RENDER_REDIRECT_DEPLOY_HOOK_PRODUCTION`
- `RENDER_BACKEND_HEALTHCHECK_URL_PRODUCTION`

How to get deploy hooks:
- Render Dashboard -> Service -> Settings -> Deploy Hook -> Create Hook
- Copy the webhook URL into the matching GitHub secret.

Behavior:
- Push to `development` triggers development hooks.
- Push to `main` triggers production hooks.
- Manual runs are available via `workflow_dispatch`.
- If hook secrets are missing, deployment steps are skipped safely.

## 2) Alert tuning controls

Environment variables (`backend/.env`):

- `ALERT_MAX_MEMORY_MB`
- `ALERT_MAX_AVG_RESPONSE_MS`
- `ALERT_MAX_P95_RESPONSE_MS`
- `ALERT_MAX_ERROR_RATE_PERCENT`
- `ALERT_MAX_SLOW_REQUESTS`
- `ALERT_SLOW_REQUEST_MS`
- `ALERT_ACTIVE_USER_WINDOW_MS`

Suggested baseline:

- Memory: `450`
- Avg response: `500`
- P95 response: `1200`
- 5xx error rate: `2.5`
- Slow request count: `25`
- Slow request threshold: `1200`
- Active user window: `1800000` (30 min)

Tune strategy:
- Start conservative and tighten one threshold at a time.
- Let production run for at least 3-7 days before each adjustment.
- Prefer reducing false positives first, then tightening.

## 3) Dashboard endpoints

Public:
- `GET /health` (liveness)
- `GET /ready` (readiness)

Admin/co-admin:
- `GET /api/admin/metrics`
- `GET /api/admin/metrics/alerts`
- `GET /api/admin/health`

Dashboard fields now include:
- `avgResponseTime`, `p95ResponseTime`
- `errorRatePercent`, `statusBreakdown`
- `slowRequestCount`, `topSlowRoutes`
- `alerts.status` and `alerts.items`

## 4) Recommended external uptime checks

Use UptimeRobot, Better Stack, or Grafana Cloud Synthetic Monitoring.

Checks:
- `GET /health` every 1 minute.
- `GET /ready` every 2-5 minutes.
- Alert after 2 consecutive failures on `/health`.
- Alert after 1 consecutive failure on `/ready` (readiness should be strict).

## 5) On-call quick triage

1. Check `alerts.status` and active `alerts.items`.
2. Inspect `statusBreakdown` for 5xx spikes.
3. Inspect `topSlowRoutes` for regression location.
4. Validate MongoDB connectivity (`database` field).
5. Confirm recent deployment in Render and roll back if needed.
