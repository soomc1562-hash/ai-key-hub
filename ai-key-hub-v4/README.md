# AI KEY HUB V4

Full-stack multi-provider AI workspace built with Next.js 14.

## Run locally
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `AUTH_SECRET` to a random value (32+ characters). Generate one with:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
5. Set `ADMIN_EMAIL` to the email that should receive administrator privileges.
6. Run `npm run dev` and open `http://localhost:3000`.

SQLite is created at `data/ai-key-hub.sqlite`.

## V4 features
- User registration/login, bcrypt password hashes, signed HttpOnly session cookie.
- Dashboard with saved conversations and request usage totals.
- AI Playground and provider theme switcher for OpenAI, Anthropic, Gemini, DeepSeek, xAI, Mistral and Qwen.
- API Manager with connection state for the current browser tab.
- Profile page with password change.
- Chat folders and saved conversations.
- Admin dashboard (set `ADMIN_EMAIL` before registering the admin account).
- Per-user ownership checks on chat CRUD.
- API keys are not persisted in localStorage, cookies or database; they remain in page memory only.

## Important deployment notes
This is a prototype, not a security-audited production service. Before public launch add email verification, password reset, CSRF/origin protections, rate limiting, abuse controls, request-size limits, privacy policy, security monitoring and backups. Use HTTPS. Do not log API keys or raw provider request URLs. SQLite requires persistent storage; a typical serverless filesystem may be ephemeral. Confirm current model names, API endpoints, availability, pricing and terms with each provider. Never commit `.env.local` or the `data/` folder.
