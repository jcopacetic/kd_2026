// npm run schedule [-- --slots 10]
// Lists Insights posts that are scheduled (pubDate in the future) and the next free publishing
// slots. Two slots a day, 08:00 and 14:00 Central (America/Chicago). The scheduled rebuilds run
// at 14:05 and 20:05 UTC, which is after both slots in daylight and standard time.
import { readdirSync, readFileSync } from 'node:fs';

const DIR = new URL('../src/content/insights/', import.meta.url);
const SLOT_HOURS = [8, 14];
const TZ = 'America/Chicago';
const want = Number(process.argv[process.argv.indexOf('--slots') + 1]) || 6;

const posts = readdirSync(DIR)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  .map((f) => {
    const fm = readFileSync(new URL(f, DIR), 'utf8').split('---')[1] ?? '';
    const get = (k) => fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim();
    return { slug: f.replace(/\.mdx?$/, ''), title: get('title'), pub: new Date(get('pubDate')), draft: get('draft') === 'true' };
  });

// UTC offset of America/Chicago on a given date, as "-05:00" / "-06:00".
function offset(date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(date).find((p) => p.type === 'timeZoneName').value; // "GMT-05:00"
  return name.replace('GMT', '') || '+00:00';
}
function slotAt(day, hour) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(day); // YYYY-MM-DD
  const probe = new Date(`${ymd}T12:00:00Z`);
  const iso = `${ymd}T${String(hour).padStart(2, '0')}:00:00${offset(probe)}`;
  return { iso, date: new Date(iso) };
}

const now = new Date();
const scheduled = posts.filter((p) => !p.draft && p.pub > now).sort((a, b) => a.pub - b.pub);
const taken = new Set(scheduled.map((p) => p.pub.toISOString()));

console.log(scheduled.length ? 'Scheduled (not live yet):' : 'Nothing scheduled.');
for (const p of scheduled) {
  const when = p.pub.toLocaleString('en-US', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
  console.log(`  ${when.padEnd(24)} ${p.slug}`);
}

const free = [];
for (let d = 0; free.length < want && d < 365; d++) {
  const day = new Date(now.getTime() + d * 86_400_000);
  for (const h of SLOT_HOURS) {
    const s = slotAt(day, h);
    if (s.date > now && !taken.has(s.date.toISOString()) && free.length < want) free.push(s.iso);
  }
}
console.log('\nNext free slots (use as pubDate):');
for (const s of free) console.log(`  pubDate: ${s}`);
