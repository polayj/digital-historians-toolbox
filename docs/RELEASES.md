# Keeping the data: nightly export, releases and Zenodo

The catalogue is designed to outlive its website and its editors. Three things make that happen:

1. **Every night**, a GitHub Action copies the approved catalogue from the site into the public repository’s `data/` folder.
2. **Now and then** (say, monthly, or after a big round of approvals) you make a **release**: a named snapshot such as `2026.10`.
3. **Zenodo**, CERN’s research archive, keeps a permanent copy of every release and gives it its own **DOI**, so people can cite exactly what the catalogue said at that moment, even if the site disappears.

Only approved records go public. Records waiting for review, the editors’ research notes and submitters’ emails never leave the site. The private seed repository is never part of a release.

---

## 1. Switch on the nightly export (once, after the site is live)

The Action needs to know where the site is.

1. On GitHub, open the repository **polayj/digital-historians-toolbox**.
2. Go to **Settings → Secrets and variables → Actions → Variables** and click **New repository variable**.
   - **Name:** `SITE_URL`
   - **Value:** the site’s address, e.g. `https://toolbox.jacobpolay.ca`
3. Run it once to check: **Actions → Nightly data export → Run workflow**. After a minute or so, `data/` should hold the approved files, committed by “github-actions[bot]”.

**Safety checks:** the Action refuses to commit anything if the files look wrong: unreadable, containing editor-only fields or unreviewed records, or links that don’t match. It also refuses if the number of cards suddenly drops by more than a fifth, which would more likely be a fault than real deletions. If you really did remove many cards, run it by hand with `ALLOW_SHRINK=yes`. GitHub emails you when a run fails.

**One GitHub quirk:** GitHub pauses scheduled Actions in public repositories after 60 days without any activity. If that happens, there’s a button on the Actions page to switch it back on.

---

## 2. Before the first release

These go into the permanent Zenodo record, which can be updated later but never deleted, so check them first:

- In **`CITATION.cff`**, replace `[EDITOR NAMES]` with the editors. Use one block per person:
  ```yaml
  authors:
    - family-names: Surname
      given-names: First
      orcid: "https://orcid.org/0000-0000-0000-0000"
  ```
- Licences are in place: CC BY 4.0 for the data (`data/LICENSE.md`), MIT for the code (`LICENSE`).
- Make sure the editors have filed the cards you want in the first release, and that the nightly export has run since.

---

## 3. Switch on Zenodo (once)

1. Go to **zenodo.org** and choose **Log in → Log in with GitHub**. Approve the request to connect your GitHub account.
2. Open your account menu and choose **GitHub**.
3. Click **Sync now**, find **polayj/digital-historians-toolbox** in the list, and switch it **On**.

From now on, Zenodo watches the repository and archives every release automatically.

---

## 4. Make a release

On GitHub: **Releases → Draft a new release**.

- **Tag:** the year and month, e.g. `2026.10` (choose “Create new tag on publish”). Use `2026.10.1` for a second release in the same month.
- **Title:** e.g. `2026.10: first public release`
- **Notes:** a line or two on what changed, e.g. how many cards and projects.
- Click **Publish release**.

(Or just ask me, and I’ll create the release from the command line for you to confirm.)

Within a few minutes, Zenodo shows a new record with a DOI under **Upload → GitHub** on zenodo.org.

---

## 5. After the first release (once)

On the Zenodo record, find **“Cite all versions?”** in the right-hand column. It shows a DOI that always points to the newest release: the **concept DOI**.

Put it in `src/lib/site.ts` as `ZENODO_CONCEPT_DOI` (or send it to me). From then on:

- The **About page** shows the latest release and its own DOI automatically, checking Zenodo once a day.
- The footer’s **“Archived on Zenodo”** link works.

Later releases need nothing else: tag, publish, done.
