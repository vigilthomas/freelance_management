/// <reference path="../pb_data/types.d.ts" />
// Production hardening: trust Caddy's X-Forwarded-For (so per-IP limits see the real client) and enable rate limiting,
// which throttles repeated login attempts.
migrate(
  (app) => {
    const s = app.settings();
    s.trustedProxy.headers = ['X-Forwarded-For'];
    s.trustedProxy.useLeftmostIP = false;
    s.rateLimits.enabled = true;
    app.save(s);
  },
  (app) => {
    const s = app.settings();
    s.trustedProxy.headers = [];
    s.rateLimits.enabled = false;
    app.save(s);
  },
);
