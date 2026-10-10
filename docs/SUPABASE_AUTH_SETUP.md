# Supabase Auth setup

AIKA uses Supabase Auth in the browser when both `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are set. If either value is absent, the existing
demo authentication remains available. The publishable key is intended for
browser use; never put a Supabase service-role or secret key in a `VITE_` variable.
This phase does not persist trips or create database tables.

## Local development

1. Copy the Supabase project URL and publishable key from the project API settings
   into the local `.env` file using the two `VITE_SUPABASE_*` variable names.
2. In the Supabase dashboard, open **Authentication → URL Configuration**.
3. Set **Site URL** to the local origin you use, such as
   `http://127.0.0.1:5173`.
4. Add both `http://127.0.0.1:5173/**` and `http://localhost:5173/**` to
   **Redirect URLs** if you use both hostnames. Add the production origin and its
   application paths before deploying.
5. Under **Authentication → Sign In / Providers → Email**, allow email signup.
   Keep email confirmation enabled for verified accounts. When confirmation is
   required, Supabase returns no session at signup; AIKA displays a confirmation
   message and does not mark the visitor authenticated.

AIKA sends the current browser origin as the signup confirmation and password
reset redirect. Supabase's default confirmation and password-recovery templates
can remain in place; their confirmation link must preserve the configured redirect.
After reset, Supabase returns to the app, the client processes the auth callback,
and the existing `#forgot` screen requests a new password.

For production email delivery, configure a custom SMTP provider and review Auth
rate limits. Supabase's built-in email sender is intended for testing and has
restrictive delivery limits. The South Asia (Mumbai) project region does not
change the redirect URL requirements.

## Useful official references

- [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Password-based Auth and password reset](https://supabase.com/docs/guides/auth/passwords)
- [Supabase JavaScript auth state changes](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
