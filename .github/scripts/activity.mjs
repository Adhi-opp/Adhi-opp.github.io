// Latest commit activity for each project repo -> assets/data/activity.json.
// Runs inside the deploy workflow (on every push and every 6 hours). To preview
// locally: `node .github/scripts/activity.mjs` (uses GITHUB_TOKEN if set; the
// public API allows 60 unauthenticated requests an hour, and this makes 8).
import { mkdir, writeFile } from "node:fs/promises";

const OWNER = "Adhi-opp";
const REPOS = { gammaleak: "GammaLeak", traderetro: "TradeRetro", alpha: "alpha", phasr: "Phasr" };
const headers = { Accept: "application/vnd.github+json", "User-Agent": "adhi-opp-portfolio" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const since = new Date(Date.now() - 30 * 864e5).toISOString();
const out = { generated: new Date().toISOString(), projects: {} };

for (const [id, repo] of Object.entries(REPOS)) {
  try {
    const { default_branch: branch } = await gh(`/repos/${OWNER}/${repo}`);
    // merge commits ("Merge pull request #12 ...") say nothing; show the work itself
    const recent = (await gh(`/repos/${OWNER}/${repo}/commits?sha=${branch}&per_page=30`)).filter((c) => c.parents.length === 1);
    const month = (await gh(`/repos/${OWNER}/${repo}/commits?sha=${branch}&since=${since}&per_page=100`)).filter((c) => c.parents.length === 1);
    const last = recent[0];
    if (!last) continue;
    out.projects[id] = {
      repo,
      sha: last.sha.slice(0, 7),
      message: last.commit.message.split("\n")[0].slice(0, 120),
      date: last.commit.committer.date,
      url: last.html_url,
      last30: month.length,
    };
  } catch (err) {
    // one unreachable repo must not fail the deploy; the site hides missing entries
    console.warn(`${repo}: ${err.message}`);
  }
}

await mkdir("assets/data", { recursive: true });
await writeFile("assets/data/activity.json", JSON.stringify(out, null, 1) + "\n");
for (const [id, p] of Object.entries(out.projects)) console.log(`${id}: ${p.sha} ${p.date.slice(0, 10)} · ${p.last30} commits in 30 days · ${p.message}`);
