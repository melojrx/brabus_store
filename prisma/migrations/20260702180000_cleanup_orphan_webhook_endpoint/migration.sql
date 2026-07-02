-- Remove orphan webhook endpoint pointing to a non-existent Hermes route
-- (only `brabus-order-paid` is registered; the bare `brabus` route 404s on every delivery).
-- Idempotent: safe to re-run, no-op if the endpoint is already gone.

DELETE FROM "webhook_deliveries"
WHERE "endpointId" IN (
    SELECT "id" FROM "webhook_endpoints"
    WHERE "url" = 'https://neo.investiorion.com/webhooks/brabus'
);

DELETE FROM "webhook_endpoints"
WHERE "url" = 'https://neo.investiorion.com/webhooks/brabus';
