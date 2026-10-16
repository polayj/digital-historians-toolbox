# Switching on the protections

The site runs as a **Cloudflare Worker**: Cloudflare’s current way of hosting sites, which has taken over from Pages. It lives at:

**https://toolbox.jacobpolay.ca**

(It also still answers at `digital-historians-toolbox.polayjacob.workers.dev`. For now the site sits on a subdomain of your personal domain, so `jacobpolay.ca` itself stays free for a personal site. Moving it to a dedicated domain later is covered at the end.)

Two Cloudflare services protect it, and ORCID provides sign-in for “I’m using this now”. All three are free at this scale, and all three need a few clicks that only you can make, because they’re tied to your accounts.

Until they’re switched on, the site fails safe:

- **The Submit form** says submissions aren’t open yet, and its button is switched off, because there’s no Turnstile secret.
- **`/admin`** refuses everyone, because there’s no Access application to vouch for them.
- **“I’m using this now”** explains that sign-in isn’t switched on, and records nothing.

**Secrets and settings:**

- **Secret keys** go in with `npx wrangler secret put NAME`, run in a terminal in the project folder. Paste the secret when asked. **Never paste a secret into a chat or a file.** Secrets take effect immediately.
- **Public settings** live in `wrangler.jsonc` and take effect on the next deploy (`npm run deploy`).

Dashboard labels change from time to time; if a button below has a slightly different name, look for the nearest match.

---

## 1. Turnstile: the “are you human?” check on the Submit form

Turnstile is Cloudflare’s replacement for CAPTCHAs. Most people never see a puzzle: it checks quietly in the background and gives the form a one-time pass.

1. Open the Cloudflare dashboard and choose **Turnstile** from the menu.
2. Click **Add widget** (it may say *Add site*).
   - **Name:** `Toolbox submit form`
   - **Hostnames:** `toolbox.jacobpolay.ca` (and `digital-historians-toolbox.polayjacob.workers.dev` if you want the form to work there too).
   - **Widget mode:** *Managed*.
3. Cloudflare shows two keys:
   - The **site key** is public; it goes into the page. Send it to me, or put it in `wrangler.jsonc` as `TURNSTILE_SITE_KEY`, replacing the test key that’s there now, then redeploy.
   - The **secret key** is private:

     ```bash
     npx wrangler secret put TURNSTILE_SECRET_KEY
     ```

4. Test it: send a submission from the live site and check that it appears in the review queue.

---

## 2. Cloudflare Access: the locked door in front of `/admin`

Access asks anyone visiting `/admin` for their email address, sends a one-time code to it, and lets them in only if the address is on your list of editors. There are no passwords to manage.

The site also checks Access’s signed pass on every `/admin` request. So if Access were ever switched off by mistake, `/admin` would lock everyone out rather than open up.

### Setting it up

1. Open **Zero Trust** from the Cloudflare dashboard (or go to one.dash.cloudflare.com).
   - The first time, it asks you to choose a **team name**, e.g. `toolbox`. Your sign-in page becomes `toolbox.cloudflareaccess.com`.
   - Choose the **Free** plan. Cloudflare may ask for payment details even for the free plan.
2. Check that **One-time PIN** is switched on as a login method (under *Settings → Authentication*). It usually is by default.
3. Go to **Access → Applications → Add an application → Self-hosted**.
   - **Application name:** `Toolbox editor’s desk`
   - **Application domain:** subdomain `toolbox`, domain `jacobpolay.ca`, path `admin`, so the application covers `toolbox.jacobpolay.ca/admin`.
4. Add a **policy**:
   - **Policy name:** `Editors`
   - **Action:** *Allow*
   - **Include → Emails:** each editor’s email address.
5. Save. On the application’s page, find the **Application Audience (AUD) Tag**, a long string of letters and numbers.
6. Send me the AUD tag and your team name, or put them in `wrangler.jsonc` as `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` and redeploy. Neither is secret.
7. Test it: visit https://toolbox.jacobpolay.ca/admin. You should get a Cloudflare page asking for your email, then a code, then the review queue with “Signed in as …” at the top.

**Adding or removing an editor** later is just a change to the policy’s email list in step 4. Nothing in the site’s code needs to change.

---

## 3. Sign in with ORCID: for “I’m using this now”

Historians sign in on orcid.org, so the site never sees their password. It asks ORCID only to confirm who they are; it can’t read or change their ORCID record.

1. Sign in to **orcid.org** with your own ORCID account.
2. Open the menu under your name and choose **Developer tools**. Register for the free **Public API**. ORCID may ask you to verify your email first.
   - **Name:** `The Digital Historian’s Toolbox`
   - **Website:** `https://toolbox.jacobpolay.ca`
   - **Description:** e.g. “Lets historians record which catalogued tools they are using. Only the ORCID iD and name are used.”
   - **Redirect URI:** your site’s address followed by `/auth/orcid/callback`, `https://toolbox.jacobpolay.ca/auth/orcid/callback`. ORCID only sends people back to addresses listed here.
3. ORCID shows a **Client ID** (starts with `APP-`) and a **Client secret**.
   - Send me the Client ID, or put it in `wrangler.jsonc` as `ORCID_CLIENT_ID` and redeploy. It isn’t secret.
   - The secret:

     ```bash
     npx wrangler secret put ORCID_CLIENT_SECRET
     ```

4. Test it: open a card on the live site, press **I’m using this now**, sign in on orcid.org, and check that you come back to the card with “You’re using this”.

To try sign-in without touching real ORCID accounts, ORCID runs a separate test site, **sandbox.orcid.org**, with its own accounts and keys. Set `ORCID_BASE` in `wrangler.jsonc` to `https://sandbox.orcid.org` while testing, then back to `https://orcid.org`.

**What’s stored:** the person’s ORCID iD and name, which cards they checked in to (once per calendar year), and a fingerprint of their sign-in cookie. Only counts are shown publicly, never who checked in.

---

## Going from preview to live

The preview shows records still waiting for review, under a “Preview: not yet reviewed” banner, and asks search engines not to index it. When the editors have filed enough cards:

1. In `wrangler.jsonc`, set `SHOW_UNREVIEWED` to `"false"`.
2. Deploy: `npm run deploy`. Only filed cards will then appear, and the banner and the no-indexing request go away.

---

## Moving to a dedicated domain later

Nothing in the code mentions the address: every link and citation is built from whichever address the site is visited at. To move it, e.g. to a project `.org`:

1. In `wrangler.jsonc`, add the new address under `routes` and deploy.
2. Update the four outside settings: Turnstile’s hostnames, the Access application’s domain, ORCID’s redirect address, and GitHub’s `SITE_URL` variable.
3. In Cloudflare, add a **redirect rule** on `jacobpolay.ca` that sends `toolbox.jacobpolay.ca/*` to the same path on the new address. Old links and footnotes keep working for as long as you keep `jacobpolay.ca`.

---

## On your own computer

`npm run dev` skips Access and signs you in as the `DEV_ADMIN_EMAIL` in `.dev.vars`. Likewise, “Sign in with ORCID” signs you in as ORCID’s fictional test researcher, Josiah Carberry (`DEV_ORCID_ID`), without contacting ORCID. Those stand-ins only exist in development mode; the real site never uses them. `.dev.vars` also holds Cloudflare’s published Turnstile **test** secret, which only works with the test site key. Copy `.dev.vars.example` to `.dev.vars` to get started.
