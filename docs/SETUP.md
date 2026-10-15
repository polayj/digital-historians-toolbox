# Switching on the protections

Two Cloudflare services protect the site. Both are free at this scale, and both need a few clicks in the Cloudflare dashboard that only you can make, because they're tied to your account. Do them once the site has been deployed for the first time (step 8), since they need its web address.

Until they're switched on, the site fails safe:

- **The Submit form** refuses every submission, because there's no Turnstile secret to check against.
- **`/admin`** refuses everyone, because there's no Access application to vouch for them.

Dashboard labels change from time to time; if a button below has a slightly different name, look for the nearest match.

---

## 1. Turnstile: the “are you human?” check on the Submit form

Turnstile is Cloudflare’s replacement for CAPTCHAs. Most people never see a puzzle: it checks quietly in the background and gives the form a one-time pass.

1. Open the Cloudflare dashboard and choose **Turnstile** from the menu.
2. Click **Add widget** (it may say *Add site*).
   - **Name:** `Toolbox submit form`
   - **Hostnames:** your site’s address, e.g. `digital-historians-toolbox.pages.dev`, plus your own domain if you add one later.
   - **Widget mode:** *Managed*.
3. Cloudflare shows two keys:
   - The **site key** is public; it goes into the page. Send it to me, or put it in `wrangler.jsonc` as `TURNSTILE_SITE_KEY`, replacing the test key that’s there now.
   - The **secret key** is private. **Don’t paste it into a chat or a file.** Instead, run this in a terminal and paste it when asked:

     ```bash
     npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name digital-historians-toolbox
     ```

4. Test it: send a submission from the live site and check that it appears in the review queue.

---

## 2. Cloudflare Access: the locked door in front of `/admin`

Access asks anyone visiting `/admin` for their email address, sends a one-time code to it, and lets them in only if the address is on your list of editors. There are no passwords to manage.

The site also checks Access’s signed pass on every `/admin` request. So if Access were ever switched off by mistake, `/admin` would lock everyone out rather than open up.

1. Open **Zero Trust** from the Cloudflare dashboard (or go to one.dash.cloudflare.com).
   - The first time, it asks you to choose a **team name**, e.g. `toolbox`. Your sign-in page becomes `toolbox.cloudflareaccess.com`.
   - Choose the **Free** plan. Cloudflare may ask for payment details even for the free plan.
2. Check that **One-time PIN** is switched on as a login method (under *Settings → Authentication*). It usually is by default.
3. Go to **Access → Applications → Add an application → Self-hosted**.
   - **Application name:** `Toolbox editor’s desk`
   - **Application domain:** your site’s address, with the path `admin`, e.g. `digital-historians-toolbox.pages.dev` / `admin`.
   - Add a second domain line for **preview copies** of the site: `*.digital-historians-toolbox.pages.dev` / `admin`. Without it, every preview link would have an unprotected desk (the site would still refuse entry, but nobody could sign in).
   - Add your own domain later, if you get one.
4. Add a **policy**:
   - **Policy name:** `Editors`
   - **Action:** *Allow*
   - **Include → Emails:** each editor’s email address.
5. Save. On the application’s page, find the **Application Audience (AUD) Tag**, a long string of letters and numbers.
6. Send me the AUD tag and your team name, or put them in `wrangler.jsonc` as `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN`. Neither is secret.
7. Test it: visit `/admin` on the live site. You should get a Cloudflare page asking for your email, then a code, then the review queue with “Signed in as …” at the top.

**Adding or removing an editor** later is just a change to the policy’s email list in step 4. Nothing in the site’s code needs to change.

---

## On your own computer

`npm run dev` skips Access and signs you in as the `DEV_ADMIN_EMAIL` in `.dev.vars`. That stand-in only exists in development mode; the real site never uses it. `.dev.vars` also holds Cloudflare’s published Turnstile **test** secret, which only works with the test site key. Copy `.dev.vars.example` to `.dev.vars` to get started.
