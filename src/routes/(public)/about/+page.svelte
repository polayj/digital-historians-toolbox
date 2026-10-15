<script lang="ts">
	import { page } from '$app/state';
	import { AFFILIATION, CONTACT_EMAIL, EDITORS, GITHUB_URL, ZENODO_CONCEPT_DOI, ZENODO_URL } from '#lib/site.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const preview = $derived(page.data.showUnreviewed);
	const year = new Date().getUTCFullYear();
	const siteUrl = $derived(page.url.origin);
	const version = $derived(data.release?.version ?? '[2026.10]');
	const versionDoi = $derived(data.release?.doi ?? '10.5281/zenodo.[XXXXXXX]');
	const isEmail = CONTACT_EMAIL.includes('@') && !CONTACT_EMAIL.startsWith('[');
</script>

<svelte:head>
	<title>About · The Digital Historian’s Toolbox</title>
	<meta name="description" content="Why the Toolbox exists, how it sorts research from benchmarks, its editorial policy, and how to cite it." />
</svelte:head>

<div class="container layout">
	<article class="main">
		<div class="intro">
			<p class="kicker">About the Toolbox</p>
			<h1>A card catalogue of what historians <em>actually</em> used.</h1>
			<p class="lede">
				The Digital Historian’s Toolbox collects the software and public datasets historians work with, and links each one to
				the projects that put it to use. It is community-submitted and editor-reviewed.
			</p>
		</div>

		<section>
			<h2>Why it exists</h2>
			<p>
				General tool directories already exist, and they’re useful. But they cover every humanities discipline, and they mostly
				tell you what a tool <em>is</em>, not what happened when a historian used it. Meanwhile, new AI tools arrive faster than
				anyone can test them on real archives.
			</p>
			<p>
				The Toolbox is narrower on purpose. It is built for historians, it records real uses with links you can check, and it is
				frank about how tools fail on historical sources.
			</p>
		</section>

		<section>
			<h2>Research is not the same as a benchmark</h2>
			<p>
				A benchmark tells you how well a tool reads. It doesn’t show that a historian learned anything with it. So every card
				sorts its projects into three kinds:
			</p>
			<dl class="kinds">
				<div style:--ink="var(--kind-research)">
					<dt>Research</dt>
					<dd>
						The tool or dataset helped answer a historical question: an article, a book, a project that makes an argument about
						the past.
					</dd>
				</div>
				<div style:--ink="var(--kind-corpus)">
					<dt>Corpus building</dt>
					<dd>
						It produced something other historians can use: transcriptions, captions, a gazetteer, an enriched or re-OCRed
						dataset.
					</dd>
				</div>
				<div style:--ink="var(--kind-evaluation)">
					<dt>Evaluation</dt>
					<dd>The tool itself was tested: benchmarks, accuracy studies, feasibility case studies. Valuable, but it isn’t use.</dd>
				</div>
			</dl>
		</section>

		<section>
			<h2>Historian’s notes</h2>
			<p>
				Every tool card answers three questions: <strong>where do my sources go</strong> when I use it,
				<strong>how has it been tested</strong>, and <strong>how does it fail on historical material</strong>. Dataset cards instead
				say how the text was made, what gaps and biases it carries, and what you’re allowed to do with it.
			</p>
			<p>
				These notes matter most for AI tools, where hallucinated text, silent spelling “corrections” and unclear data terms are
				common and easy to miss.
			</p>
		</section>

		<section>
			<h2>How sorting works</h2>
			<p>
				<strong>Trending</strong> counts research and corpus-building uses within a time window you choose, plus “I’m using this
				now” check-ins from historians who are signed in. Evaluations never count, so a burst of benchmarks can’t push a tool up.
				<strong>Most used</strong> counts all time, which favours older tools; <strong>Newest</strong> and <strong>A–Z</strong> do
				what they say.
			</p>
		</section>

		<section>
			<h2>Editorial policy</h2>
			<ul>
				<li>Every submission is reviewed by an editor before it appears.</li>
				<li>Every project link is opened and checked to confirm it actually mentions the tool or dataset.</li>
				<li>Anything unverified or contradictory is flagged on the card, never quietly filled in.</li>
				<li>Conflicts of interest are disclosed on the card, including the editors’ own publications.</li>
				<li>
					Every card shows when it was last updated. Cards not checked in 12 months are marked “Due for review”, because prices,
					licences and data terms change.
				</li>
				<li>Anyone can suggest a correction from any card, and each card keeps a version history.</li>
			</ul>
		</section>

		<section>
			<h2>Built to outlast its editors</h2>
			<p>
				Tool directories have a habit of disappearing when their volunteers run out of time; DiRT, the Digital Research Tools
				directory, survived only by being folded into TAPoR. The Toolbox is built so its contents outlive both its editors and its
				website:
			</p>
			<ul>
				<li>
					<strong>Open data on GitHub.</strong> Every card, project link and historian’s note is published as plain JSON and CSV
					files that anyone can download, reuse or fork, under a CC BY 4.0 licence.
					<a href="{GITHUB_URL}/tree/main/data">See the data</a>.
				</li>
				<li>
					<strong>Archived on Zenodo.</strong> Each release of the data is deposited in Zenodo, CERN’s research repository, with its
					own DOI, so a citable copy remains even if this site goes offline.
				</li>
				<li><strong>A small team of co-editors,</strong> so the catalogue never depends on one person’s time.</li>
			</ul>
		</section>

		<section>
			<h2>Your privacy</h2>
			<ul>
				<li>
					<strong>Submissions:</strong> your name is credited on the card if you give one; your email is used only by the editors
					to ask about your submission and is never shown.
				</li>
				<li>
					<strong>“I’m using this now”:</strong> you sign in on orcid.org, so the Toolbox never sees your password. It stores your
					ORCID iD and name and which cards you checked in to, once per year. Only totals are ever shown, never who.
				</li>
			</ul>
		</section>

		<section>
			<h2>Related resources</h2>
			<ul class="related">
				<li>
					<a href="https://tapor.ca" target="_blank" rel="noopener">TAPoR</a>
					<span>· the long-running directory of digital humanities tools, which absorbed DiRT.</span>
				</li>
				<li>
					<a href="https://marketplace.sshopencloud.eu/" target="_blank" rel="noopener">SSH Open Marketplace</a>
					<span>· a large European catalogue of tools, datasets and workflows across the social sciences and humanities.</span>
				</li>
				<li>
					<a href="https://programminghistorian.org" target="_blank" rel="noopener">Programming Historian</a>
					<span>· peer-reviewed tutorials. The Toolbox links to its lessons as guides rather than repeating them.</span>
				</li>
				<li>
					<a href="https://github.com/maehr/awesome-digital-history" target="_blank" rel="noopener">Awesome Digital History</a>
					<span>· a community list of archives and primary sources online.</span>
				</li>
			</ul>
		</section>
	</article>

	<aside class="side" aria-label="At a glance">
		<section class="box">
			<h2 class="label">{preview ? 'In this preview' : 'In the catalogue'}</h2>
			<div class="stats">
				<div><span class="n tool">{data.counts.tools}</span><span>tools</span></div>
				<div><span class="n dataset">{data.counts.datasets}</span><span>datasets</span></div>
				<div><span class="n project">{data.counts.projects}</span><span>projects</span></div>
			</div>
			<p class="small">
				{preview
					? 'Seeded October 2026 and not yet reviewed by the editors. Verify before citing.'
					: 'Every card here has been checked by the editors. Verify before citing.'}
			</p>
			<div class="facts">
				<span><span class="k">Latest data release</span><span>{version}</span></span>
				<span>
					<span class="k">DOI</span>
					{#if data.release}<a href="https://doi.org/{data.release.doi}">{data.release.doi}</a>{:else}<span>10.5281/zenodo.[…]</span>{/if}
				</span>
				<span><span class="k">Source</span><a href={GITHUB_URL}>GitHub repository</a></span>
			</div>
		</section>

		<section class="box">
			<h2 class="label">Who runs it</h2>
			<p>{EDITORS}</p>
			<p class="muted">{AFFILIATION}</p>
			<p>{#if isEmail}<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>{:else}{CONTACT_EMAIL}{/if}</p>
		</section>

		<section class="box">
			<h2 class="label">Cite the Toolbox</h2>
			<p class="small muted">The website</p>
			<p class="cite">{EDITORS === '[EDITOR NAMES]' ? '[Editors]' : EDITORS}, The Digital Historian’s Toolbox, {year}, {siteUrl}.</p>
			<p class="small muted">A fixed version of the data</p>
			<p class="cite">
				{EDITORS === '[EDITOR NAMES]' ? '[Editors]' : EDITORS}, The Digital Historian’s Toolbox: data, version {version}, Zenodo,
				doi:{versionDoi}.
			</p>
			<p class="small">Cite the Zenodo version when your argument depends on what the catalogue said at a particular moment.</p>
			{#if ZENODO_URL}
				<p class="small">
					All versions: <a href={ZENODO_URL}>doi:{ZENODO_CONCEPT_DOI}</a> (always points to the latest).
				</p>
			{/if}
		</section>

		<section class="box cta raised-3">
			<h2>Know a tool or project we’re missing?</h2>
			<p>Research uses are the most valuable thing you can add. Even a single article that names its tools helps.</p>
			<a class="btn btn-primary" href="/submit">Submit an entry</a>
		</section>
	</aside>
</div>

<style>
	.layout {
		padding-top: 56px;
		padding-bottom: 72px;
		display: flex;
		flex-wrap: wrap;
		gap: 48px;
		align-items: flex-start;
	}
	.main {
		flex: 999 1 560px;
		min-width: 0;
		max-width: 780px;
		display: flex;
		flex-direction: column;
		gap: 40px;
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	h1 {
		font-size: clamp(34px, 5.5vw, 48px);
		line-height: 1.12;
	}
	h1 em {
		color: var(--accent);
	}
	.lede {
		font-size: 19px;
		line-height: 1.65;
		color: var(--text-2);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.main h2 {
		font-size: 30px;
	}
	.main p,
	.main li {
		font-size: 17px;
		line-height: 1.7;
		color: var(--text-2);
	}
	.main strong {
		color: var(--text);
	}
	.main ul {
		margin: 0;
		padding-left: 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.main a {
		padding: 10px 0;
	}
	.kinds {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.kinds div {
		border-left: 3px solid var(--ink);
		padding: 4px 0 4px 16px;
	}
	.kinds dt {
		font-weight: 600;
		font-size: 17px;
		color: var(--ink);
	}
	.kinds dd {
		margin: 4px 0 0;
		font-size: 16px;
		line-height: 1.6;
		color: var(--text-2);
	}
	.related {
		list-style: none;
		padding: 0 !important;
		gap: 4px !important;
	}
	.related li {
		font-size: 16px !important;
		line-height: 1.55 !important;
	}
	.related span {
		color: var(--text-3);
	}

	.side {
		flex: 1 1 280px;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.box {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 22px;
		gap: 10px;
		--muted: #998e7c;
	}
	.box h2.label {
		font-size: 12px;
	}
	.box p {
		font-size: 16px;
		line-height: 1.55;
	}
	.small {
		font-size: 14px !important;
		color: var(--muted);
	}
	.muted {
		color: var(--text-3);
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		text-align: center;
	}
	.stats div {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 13px;
		color: var(--text-3);
	}
	.n {
		font-family: var(--font-serif);
		font-size: 34px;
	}
	.n.tool {
		color: var(--accent);
	}
	.n.dataset {
		color: var(--dataset);
	}
	.n.project {
		color: var(--kind-research);
	}
	.facts {
		display: flex;
		flex-direction: column;
		gap: 0;
		border-top: 1px solid var(--border);
		padding-top: 12px;
		font-size: 14px;
	}
	.facts > span {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
		min-height: var(--tap);
		overflow-wrap: anywhere;
	}
	.facts a {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
	}
	.k {
		color: var(--muted);
	}
	.cite {
		font-family: var(--font-mono);
		font-size: 13px !important;
		line-height: 1.6;
		color: var(--text-2);
		overflow-wrap: anywhere;
	}
	.cta {
		border-color: var(--accent);
		gap: 12px;
	}
	.cta h2 {
		font-size: 24px;
	}
	.cta p {
		font-size: 15px;
		color: var(--text-2);
	}
	@media (max-width: 860px) {
		.side {
			max-width: none;
		}
	}
</style>
