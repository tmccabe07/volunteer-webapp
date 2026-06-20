# Quickstart: Email Integration (Local Dev + Production)

## Local Development — Console Mode

No account or extra library needed. Set `EMAIL_TRANSPORT=console` and `MailService.send()` logs the recipient, subject, and full HTML body to stdout instead of sending anything.

Add to `backend/.env`:

```env
EMAIL_TRANSPORT=console
EMAIL_FROM=noreply@cubscouts.local
```

When you trigger a send, the backend logs will show something like:

```
[MailService] TO: jane@example.com
[MailService] SUBJECT: Upcoming Event: Pack Meeting – Saturday June 28
[MailService] HTML: <html>...</html>
```

---

## Production — Resend

1. Create a Resend account at https://resend.com
2. Add and verify your sending domain under **Domains** (adds SPF, DKIM, DMARC records to your DNS)
3. Create an API key under **API Keys** (send-only scope is sufficient)
4. Set in your production environment:

```env
EMAIL_TRANSPORT=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Free Tier Limits

- 3,000 emails/month, 100/day
- At ~500 emails/week (~2,000/month) this project fits comfortably within the free tier.

---

## Environment Variable Reference

| Variable | Local dev | Production |
|---|---|---|
| `EMAIL_TRANSPORT` | `console` | `resend` |
| `RESEND_API_KEY` | — | Resend API key |
| `EMAIL_FROM` | Any value | Verified Resend sender address |
