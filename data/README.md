# The Digital Historian’s Toolbox: open data

This folder holds the **approved** contents of the catalogue as plain files anyone can download, reuse or fork. They are refreshed every night from the live site, and every tagged release of this repository is archived on Zenodo with its own DOI.

Records still waiting for editorial review are not included, and neither are the editors’ internal research notes.

## Files

| File | What it holds |
|---|---|
| `entries.json` | The catalogue cards: tools and datasets, with their description, “at a glance” facts, historian’s notes, drawers and guide cards, search-filter values, and the date each card was last updated. |
| `projects.json` | Projects that used or tested those entries, each classed as `research`, `corpus_building` or `evaluation`, with a link to the project. |
| `links.csv` | One row per project–entry pair (the lines of the network graph): `project_id,entry_id,kind`. |
| `guides.json` | Tutorials and guides for each entry (for example, Programming Historian lessons). |
| `taxonomy.json` | The drawers, their guide cards, and what the three project kinds mean. |

The files are empty until the editors approve the first cards.

## Things to know

- **Research, corpus building and evaluation are kept apart.** An evaluation (a benchmark or accuracy study) shows how well a tool reads; it doesn’t show that a historian learned anything with it. The site’s “Most used” and “Trending” counts leave evaluations out, as well as projects flagged `tried_and_rejected`.
- **Project years are written as found** (`"2023"`, `"2000–"`, `"c. 2011"`, `"n.d."`). For counting, the site uses the last four-digit year in the string and ignores undated projects.
- **Flags** on projects: `editor_conflict_of_interest` (the editors’ own work), `tried_and_rejected`, `public_history`, `student_project`.
- **Prices, licences and data terms change.** Check `last_updated` on each card, and the original source, before relying on a detail.

## Licence

The catalogue’s own text and data (card descriptions, facts, historian’s notes, project classifications and links) are released under **Creative Commons Attribution 4.0 International (CC BY 4.0)**: <https://creativecommons.org/licenses/by/4.0/>. You may copy, adapt and reuse them for any purpose, including commercially, as long as you credit *The Digital Historian’s Toolbox*.

The **tools, datasets, publications and websites the catalogue links to keep their own terms.** This licence covers the catalogue’s descriptions of them, not the resources themselves.

## How to cite

Cite the release you used, so others can see exactly what the catalogue said at that moment. The DOI for each release is on Zenodo; see `CITATION.cff` at the top of the repository, or the About page on the site.
