# Supabase Auth email delivery

BLACKPIPS production Auth uses `https://www.blackpips.com` as its canonical origin. OAuth and
password recovery use `/auth/callback`; signup email verification uses `/auth/confirm`.

## Supabase Dashboard settings

In **Authentication > URL Configuration**:

- Site URL: `https://www.blackpips.com`
- Redirect URL: `https://www.blackpips.com/auth/callback`
- Redirect URL: `https://www.blackpips.com/auth/confirm`
- Do not add apex-domain versions. Production Auth starts and completes on the canonical `www` host.

In **Authentication > Email Templates > Confirm signup**, use the checked-in template at
`supabase/templates/confirmation.html`. Its verification button links to:

`https://www.blackpips.com/auth/confirm?token_hash={{ .TokenHash }}&type=email`

The dedicated server route verifies the token hash and writes the resulting session to SSR cookies.
Do not replace this with `{{ .ConfirmationURL }}`, which sends signup confirmation back through the
browser-specific PKCE code flow.

In **Authentication > SMTP Settings**, enable custom SMTP and enter:

- Sender name: `BlackPips`
- Sender email: `noreply@blackpips.com`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the BLACKPIPS Resend API key stored securely as `RESEND_API_KEY`

Copy the API key from the Resend API Keys page or the production secret store directly into the
Supabase Dashboard. Never copy it into source control. The `blackpips.com` sending domain must
remain verified in Resend, including the DNS records Resend provides.

After saving SMTP settings, send a real confirmation to an address outside the Supabase project
team and inspect **Authentication > Logs** plus Resend Logs if it does not arrive. Disable link
tracking for Auth emails if a mail security scanner rewrites confirmation links.
