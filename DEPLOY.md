# Self-Hosting Unscrewed

Follow the complete [README deployment guide](README.md#deploy-api-and-frontend). Create your own D1, KV, R2, API Worker, Pages frontend, Turnstile widget, and optional authorized email sender. Use related HTTPS domains for session cookies. Set the exact frontend origin in PUBLIC_BASE_URL and your own API URL in VITE_API_BASE.

Apply migrations, deploy the API, build/deploy the frontend, and verify account/photo/negotiation/moderation flows before inviting users. Optional root Pages Functions contain original hosted-site URLs and need adaptation before use. No access to the original operator account is required.
