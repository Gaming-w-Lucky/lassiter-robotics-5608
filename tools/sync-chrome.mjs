#!/usr/bin/env node
/*
  Keeps the nav, phone menu and footer identical on every page.
  Edit them HERE, then run:   node tools/sync-chrome.mjs
  Each page marks its own nav item as current via the PAGES list below.
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IG = 'https://www.instagram.com/lassiterrobotics/';
const EMAIL = 'haasith.lucky@gmail.com';
const COACH = 'tayler.simons@cobbk12.org';   // TEMP contact address: replace with the team's own email
const PAGES = { 'index.html': 'home', 'robots.html': 'robots', 'outreach.html': 'outreach', 'join-team-5608.html': 'join', 'team-hub.html': 'hub', 'sponsors.html': 'sponsors' };

const links = page => [
  ['home', page === 'index.html' ? '#top' : 'index.html', 'Home'],
  ['about', page === 'index.html' ? '#about' : 'index.html#about', 'About'],
  ['robots', 'robots.html', 'Robots'],
  ['outreach', 'outreach.html', 'Outreach'],
  ['join', 'join-team-5608.html', 'Join'],
  ['sponsors', 'sponsors.html', 'Sponsors'],
];

function nav(page, cur) {
  const items = links(page).map(([k, href, label]) => `      <a${k === cur ? ' class="on" aria-current="page"' : ''} href="${href}">${label}</a>`).join('\n');
  return `<header class="nav${page === 'index.html' ? '' : ' solid'}" id="nav">
  <div class="nav-in">
    <a class="mark" href="${page === 'index.html' ? '#top' : 'index.html'}"><b>5608</b><span>Lassiter Robotics</span></a>
    <nav class="nav-links" aria-label="Main">
${items}
      <a href="https://5608boosters.org/" target="_blank" rel="noopener">Boosters ↗</a>
      <a class="ig-link" href="${IG}" target="_blank" rel="noopener" aria-label="Lassiter Robotics on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" class="dot"/></svg></a>
      <a class="hub-link${cur === 'hub' ? ' on' : ''}" href="team-hub.html"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>Team Hub</a>
    </nav>
    <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>
  </div>
</header>`;
}

function mobile(page) {
  const items = links(page).map(([, href, label], i) => `  <a href="${href}">${label} <span>0${i + 1}</span></a>`).join('\n');
  return `<div class="mobile" id="mobile">
${items}
  <a href="https://5608boosters.org/" target="_blank" rel="noopener">Boosters <span>↗</span></a>
  <a href="${IG}" target="_blank" rel="noopener">Instagram <span>↗</span></a>
  <a href="team-hub.html">Team Hub <span>Members</span></a>
</div>`;
}

function footer(page) {
  const h = (anchor) => page === 'index.html' ? anchor : 'index.html' + anchor;
  return `<footer>
  <div class="foot">
    <div>
      <h4>Lassiter Robotics<br><span style="color:var(--crimson-lt)">FRC Team 5608</span></h4>
      <address class="addr">Lassiter High School<br>2601 Shallowford Rd<br>Marietta, GA 30066</address>
      <p class="foot-mail"><span class="who">Coach Simons</span><a href="mailto:${COACH}">${COACH}</a></p>
      <p class="foot-mail"><span class="who">Team</span><a href="mailto:${EMAIL}">${EMAIL}</a> <span class="temp">temp</span></p>
    </div>
    <div class="col">
      <b>Team</b>
      <a href="${h('#about')}">About</a>
      <a href="robots.html">Robots</a>
      <a href="outreach.html">Outreach</a>
      <a href="join-team-5608.html">Join</a>
      <a href="sponsors.html">Sponsors</a>
      <a href="team-hub.html">Team Hub (members)</a>
    </div>
    <div class="col">
      <b>Elsewhere</b>
      <a href="${IG}" target="_blank" rel="noopener">Instagram ↗</a>
      <a href="https://www.thebluealliance.com/team/5608" target="_blank" rel="noopener">The Blue Alliance ↗</a>
      <a href="https://www.firstinspires.org/" target="_blank" rel="noopener">FIRST ↗</a>
      <a href="https://5608boosters.org/" target="_blank" rel="noopener" style="color:var(--gold-lt)">Boosters &amp; Sponsors ↗</a>
    </div>
  </div>
  <div class="foot-bar">
    <div>© 2026 Lassiter Robotics · FRC Team 5608</div>
    <div>T4L · Trojans for Life</div>
  </div>
</footer>`;
}

for (const [page, cur] of Object.entries(PAGES)) {
  const p = join(ROOT, page);
  let s = readFileSync(p, 'utf8');
  const before = s;
  s = s.replace(/<header class="nav[^"]*" id="nav">[\s\S]*?<\/header>/, nav(page, cur));
  s = s.replace(/<div class="mobile" id="mobile">[\s\S]*?\n<\/div>/, mobile(page));
  s = s.replace(/<footer>[\s\S]*?<\/footer>/, footer(page));
  for (const [name, re] of [['nav', /<header class="nav/], ['mobile menu', /<div class="mobile"/], ['footer', /<footer>/]])
    if (!re.test(s)) console.warn(`  ! ${page}: no ${name} found`);
  if (s !== before) { writeFileSync(p, s); console.log('synced', page); } else console.log('unchanged', page);
}
