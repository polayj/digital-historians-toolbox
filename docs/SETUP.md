# Switching on the protections

Two Cloudflare services protect the site, and ORCID provides sign-in for “I’m using this now”. All three are free at this scale, and all three need a few clicks that only you can make, because they're tied to your accounts. Do them once the site has been deployed for the first time (step 8), since they need its web address.

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

## 3. Sign in with ORCID: for “I’m using this now”

Historians sign in on orcid.org, so the site never sees their password. It asks ORCID only to confirm who they are; it can't read or change their ORCID record. Until this is set up, the button explains that sign-in isn't switched on yet and records nothing.

1. Sign in to **orcid.org** with your own ORCID account.
2. Open the menu under your name and choose **Developer tools**. Register for the free **Public API**. ORCID may ask you to verify your email first.
   - **Name:** `The Digital Historian’s Toolbox`
   - **Website:** your site’s address.
   - **Description:** e.g. “Lets historians record which catalogued tools they are using. Only the ORCID iD and name are used.”
   - **Redirect URI:** your site’s address followed by `/auth/orcid/callback`, e.g. `https://digital-historians-toolbox.pages.dev/auth/orcid/callback`. Add your own domain’s version too, if you get one. ORCID only sends people back to addresses listed here, so sign-in won’t work on preview copies unless you add those too.
3. ORCID shows a **Client ID** (starts with `APP-`) and a **Client secret**.
   - Send me the Client ID, or put it in `wrangler.jsonc` as `ORCID_CLIENT_ID`. It isn’t secret.
   - The secret goes in the same way as Turnstile’s, never into chat or a file:

     ```bash
     npx wrangler pages secret put ORCID_CLIENT_SECRET --project-name digital-historians-toolbox
     ```

4. Test it: open a card on the live site, press **I’m using this now**, sign in on orcid.org, and check that you come back to the card with “You’re using this”.

To try sign-in without touching real ORCID accounts, ORCID runs a separate test site, **sandbox.orcid.org**, with its own accounts and keys. Set `ORCID_BASE` in `wrangler.jsonc` to `https://sandbox.orcid.org` while testing, then back to `https://orcid.org`.

**What's stored:** the person's ORCID iD and name, which cards they checked in to (once per calendar year), and a fingerprint of their sign-in cookie. Only counts are shown publicly, never who checked in.

---

## On your own computer

`npm run dev` skips Access and signs you in as the `DEV_ADMIN_EMAIL` in `.dev.vars`. Likewise, “Sign in with ORCID” signs you in as ORCID’s fictional test researcher, Josiah Carberry (`DEV_ORCID_ID`), without contacting ORCID. That stand-in only exists in development mode; the real site never uses it. `.dev.vars` also holds Cloudflare’s published Turnstile **test** secret, which only works with the test site key. Copy `.dev.vars.example` to `.dev.vars` to get started.
