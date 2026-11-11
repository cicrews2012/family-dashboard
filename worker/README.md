# family-dashboard-api

Cloudflare Worker for the family dashboard. Deployed by `.github/workflows/deploy-worker.yml`.

Credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `SETUP_KEY`,
`DEVICE_KEYS`) must be stored in Cloudflare with **Type = Secret**. The deploy refuses to run
if any of them is stored as Text, because Text values are printed in the public Actions log.
