# Cloudflare Pages Deployment — GrowthifyEdge HRMS

The app is a static SPA — no server runtime, no functions, no Workers.

## Build settings

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `main` |

SPA deep links are handled by `public/_redirects` (`/* /index.html 200`),
which ships into `dist/` automatically.

## 1. Create the Pages project

1. Cloudflare dashboard → **Workers & Pages → Create → Pages**.
2. **Connect to Git** → authorize GitHub → select the HRMS repository.
3. Production branch: `main`. Framework preset: *None* (or Vite).
4. Build command `npm run build`, output directory `dist`.

## 2. Environment variables

**Settings → Environment variables**, set for **Preview** and **Production**
separately (all four are safe for browser exposure):

| Variable | Preview | Production |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key | anon key |
| `VITE_APP_ENV` | `preview` | `production` |
| `VITE_APP_URL` | `https://<project>.pages.dev` | `https://hrms.growthifyedge.com` |

Never add `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_PASSWORD` or
`CLOUDFLARE_API_TOKEN` here.

## 3. Supabase auth redirects

In Supabase **Authentication → URL Configuration**, add:

- `https://*.<project>.pages.dev/**` (previews)
- `https://hrms.growthifyedge.com/**` (production)

## 4. Test a preview deployment

1. Push a branch → Cloudflare builds a preview URL automatically.
2. Verify: login, dashboard, `/people` deep link, browser refresh on
   `/people/<id>`, currency switching, mobile layout.

## 5. Attach the custom domain (production launch only — Owner approval required)

1. Pages project → **Custom domains → Set up a custom domain**.
2. Enter `hrms.growthifyedge.com`.
3. Since `growthifyedge.com` is on Cloudflare DNS, accept the suggested CNAME
   record (`hrms` → `<project>.pages.dev`, proxied).
4. Wait for DNS verification (usually < 5 minutes).
5. SSL is issued automatically — verify the padlock and certificate.

## 6. Verify DNS + SSL

```bash
nslookup hrms.growthifyedge.com
curl -I https://hrms.growthifyedge.com
```

Expect a 200 with `content-type: text/html`.

## 7. Rollback

Pages project → **Deployments** → pick a previous good deployment → **⋯ →
Rollback to this deployment**. Rollback is instant and does not rebuild.

## Portability note

Nothing here is Cloudflare-specific except `_redirects` (also supported by
Netlify). The app can move to any static host that supports an SPA fallback.
No Vercel configuration or dependency exists in the repository.
