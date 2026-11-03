#!/usr/bin/env node
/*
  Builds the members-only Team Hub.

  Reads   _private/team-hub.md          (the list of resources, see the top of that file)
          _private/hub-files/*          (any files the list points at)
  Writes  team-hub.html                 (only the encrypted payload between the HUB-DATA markers)

    node tools/build-team-hub.mjs                       asks for the team username + password
    HUB_USER=... HUB_PASS=... node tools/build-team-hub.mjs

  Encryption (must match the unlock code in team-hub.html):
  PBKDF2-SHA256(lowercase(trim(user)) + "\0" + password, salt, ITER) -> AES-256-GCM
  over JSON { html, files: { name: { type, data(base64) } } }.
*/
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '_private', 'team-hub.md');
const FILES_DIR = join(ROOT, '_private', 'hub-files');
const OUT = join(ROOT, 'team-hub.html');
const ITER = 600000;
const MAX_TOTAL = 20 * 1024 * 1024;

/* ------------------------------------------------------------ parse */
function parse(text) {
  const sections = [];
  let cur = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    if (line.startsWith('# ')) {
      cur = { title: line.slice(2).trim(), desc: '', items: [] };
      sections.push(cur);
    } else if (line.startsWith('>') && cur) {
      cur.desc = line.slice(1).trim();
    } else if (line.startsWith('- ') && cur) {
      const [title = '', link = '', note = '', ...rest] = line.slice(2).split('|').map(s => s.trim());
      const item = { title, link, note, image: '' };
      rest.forEach(extra => { const m = extra.match(/^image:\s*(.*)$/i); if (m) item.image = m[1].trim(); });
      if (!title) throw new Error(`Line ${i + 1}: an item needs a title before the first |`);
      cur.items.push(item);
    } else {
      throw new Error(`Line ${i + 1} isn't a section (# Name), description (> text), or item (- Title | link | note):\n  ${raw}`);
    }
  });
  return sections;
}

/* ------------------------------------------------------------ files */
const MIME = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip', '.step': 'application/step', '.stp': 'application/step', '.stl': 'model/stl', '.dxf': 'image/vnd.dxf' };
const files = {};
let total = 0;
function addFile(name) {
  const p = join(FILES_DIR, name);
  if (!existsSync(p)) throw new Error(`"${name}" is listed in team-hub.md but isn't in _private/hub-files/`);
  if (!files[name]) {
    const size = statSync(p).size;
    total += size;
    if (size > 5 * 1024 * 1024) console.warn(`  ! ${name} is ${(size / 1048576).toFixed(1)} MB. Consider Google Drive for big files.`);
    files[name] = { type: MIME[extname(name).toLowerCase()] || 'application/octet-stream', data: readFileSync(p).toString('base64') };
  }
}

/* ------------------------------------------------------------ render */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isUrl = s => /^(https?:\/\/|mailto:)/i.test(s);
const isTodo = s => /^todo$/i.test(s);

function kind(link) {
  const l = link.toLowerCase();
  if (l.startsWith('mailto:')) return 'Email';
  if (l.includes('docs.google.com/document')) return 'Google Doc';
  if (l.includes('docs.google.com/spreadsheets')) return 'Google Sheet';
  if (l.includes('docs.google.com/presentation')) return 'Google Slides';
  if (l.includes('docs.google.com/forms') || l.includes('forms.gle')) return 'Google Form';
  if (l.includes('calendar.google.com')) return 'Calendar';
  if (l.includes('drive.google.com')) return 'Google Drive';
  if (l.includes('onshape.com')) return 'Onshape';
  if (l.includes('github.com')) return 'GitHub';
  if (l.includes('youtube.com') || l.includes('youtu.be')) return 'Video';
  if (l.includes('sharepoint.com') || l.includes('onedrive') || l.includes('1drv.ms')) return 'OneDrive';
  const ext = extname(l.split(/[?#]/)[0]);
  return { '.pdf': 'PDF', '.doc': 'Word', '.docx': 'Word', '.xls': 'Excel', '.xlsx': 'Excel', '.ppt': 'PowerPoint', '.pptx': 'PowerPoint',
    '.png': 'Image', '.jpg': 'Image', '.jpeg': 'Image', '.step': 'STEP file', '.stp': 'STEP file', '.stl': 'STL file', '.dxf': 'DXF drawing', '.zip': 'ZIP' }[ext]
    || (isUrl(link) ? 'Link' : 'File');
}

function renderItem(it) {
  const search = esc(`${it.title} ${it.note} ${it.link && !isTodo(it.link) ? kind(it.link) : ''}`.toLowerCase());
  // picture items (CAD etc.) render as figures; everything else as list rows
  if (it.image) {
    let img;
    if (isTodo(it.image)) img = '<div class="hub2-fig-img todo"><span>Image coming soon</span></div>';
    else if (isUrl(it.image)) img = `<div class="hub2-fig-img"><img src="${esc(it.image)}" alt="" loading="lazy"></div>`;
    else { addFile(it.image); img = `<div class="hub2-fig-img"><img data-file-src="${esc(it.image)}" alt=""></div>`; }
    const cap = `<figcaption><b>${esc(it.title)}</b>${it.note ? ` <span>${esc(it.note)}</span>` : ''}${isTodo(it.link) || !it.link ? ' <em>Coming soon</em>' : ''}</figcaption>`;
    if (!it.link || isTodo(it.link)) return `<figure class="hub2-fig" data-q="${search}">${img}${cap}</figure>`;
    if (isUrl(it.link)) return `<figure class="hub2-fig" data-q="${search}"><a href="${esc(it.link)}" target="_blank" rel="noopener">${img}${cap}</a></figure>`;
    addFile(it.link);
    return `<figure class="hub2-fig" data-q="${search}"><a href="#" data-file="${esc(it.link)}" download="${esc(basename(it.link))}">${img}${cap}</a></figure>`;
  }
  const note = it.note ? `<i>${esc(it.note)}</i>` : '';
  if (!it.link) return `<li data-q="${search}"><div class="hub2-row plain"><span class="k"></span><b>${esc(it.title)}</b>${note}</div></li>`;
  if (isTodo(it.link)) return `<li data-q="${search}"><div class="hub2-row soon"><span class="k">Coming soon</span><b>${esc(it.title)}</b>${note}</div></li>`;
  if (isUrl(it.link)) return `<li data-q="${search}"><a class="hub2-row" href="${esc(it.link)}" target="_blank" rel="noopener"><span class="k">${kind(it.link)}</span><b>${esc(it.title)}</b>${note}<span class="go" aria-hidden="true">↗</span></a></li>`;
  addFile(it.link);
  return `<li data-q="${search}"><a class="hub2-row" href="#" data-file="${esc(it.link)}" download="${esc(basename(it.link))}"><span class="k">${kind(it.link)}</span><b>${esc(it.title)}</b>${note}<span class="go" aria-hidden="true">↓</span></a></li>`;
}

function render(sections) {
  const ann = sections.find(s => /^announcements?$/i.test(s.title));
  const rest = sections.filter(s => s !== ann);
  const tabs = ['<a class="hub-tab" href="#hub-home" data-tab="hub-home">Home</a>']
    .concat(rest.map(s => `<a class="hub-tab" href="#hub-${slug(s.title)}" data-tab="hub-${slug(s.title)}">${esc(s.title)}</a>`)).join('');
  const notices = ann ? ann.items.map(it => `<div class="hub2-notice" data-q="${esc((it.title + ' ' + it.note).toLowerCase())}"><b>${esc(it.title)}</b>${it.note ? `<p>${esc(it.note)}</p>` : ''}${it.link && !isTodo(it.link) ? `<p><a href="${esc(it.link)}" target="_blank" rel="noopener">Open ↗</a></p>` : ''}</div>`).join('') : '';
  const index = rest.map(s => {
    const soon = s.items.filter(it => isTodo(it.link)).length;
    return `<li><a class="hub2-row" href="#hub-${slug(s.title)}" data-tab="hub-${slug(s.title)}"><span class="k">${s.items.length} item${s.items.length === 1 ? '' : 's'}${soon ? `, ${soon} soon` : ''}</span><b>${esc(s.title)}</b><i>${esc(s.desc)}</i><span class="go" aria-hidden="true">→</span></a></li>`;
  }).join('');
  const home = `<section class="hub-panel" id="hub-home" data-panel>
      ${notices ? `<h2 class="hub2-h">This week</h2>${notices}` : ''}
      <h2 class="hub2-h">Everything in the hub</h2><ul class="hub2-list">${index}</ul>
    </section>`;
  const panels = rest.map(s => {
    const pics = s.items.filter(it => it.image), rows = s.items.filter(it => !it.image);
    return `<section class="hub-panel" id="hub-${slug(s.title)}" data-panel>
      <h2 class="hub2-h">${esc(s.title)}</h2>${s.desc ? `<p class="p2-note">${esc(s.desc)}</p>` : ''}
      ${pics.length ? `<div class="hub2-figs">${pics.map(renderItem).join('')}</div>` : ''}
      ${rows.length ? `<ul class="hub2-list">${rows.map(renderItem).join('')}</ul>` : ''}
    </section>`;
  }).join('');
  return `<section class="hub2-head"><div class="p2-wrap">
      <p class="p2-eyebrow">Team Hub</p>
      <h1 class="p2-title">Welcome back, Trojans.</h1>
    </div></section>
    <div class="hub-nav"><div class="p2-wrap hub-nav-in"><nav class="hub-tabs" aria-label="Hub sections">${tabs}</nav>
      <label class="hub-search"><span class="sr">Search the hub</span><input id="hubSearch" type="search" placeholder="Search the hub" autocomplete="off"></label></div></div>
    <div class="p2-wrap hub2-body">${home}${panels}
      <p class="hub-none" id="hubNone" hidden>Nothing matches that search.</p>
      <p class="hub-howto">To add something, edit <code>_private/team-hub.md</code> and run <code>update-team-hub.bat</code>. Instructions are at the top of that file.</p>
    </div>`;
}

/* ------------------------------------------------------------ main */
function ask(question, hidden) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

let html;
try {
  const sections = parse(readFileSync(SRC, 'utf8'));
  html = render(sections);
  console.log(`Read ${sections.length} sections, ${sections.reduce((n, s) => n + s.items.length, 0)} items, ${Object.keys(files).length} attached files.`);
} catch (e) {
  console.error('\n' + e.message + '\n');
  process.exit(1);
}
if (total > MAX_TOTAL) { console.error(`Attached files total ${(total / 1048576).toFixed(1)} MB. Keep it under 20 MB (move big files to Google Drive).`); process.exit(1); }

const user = process.env.HUB_USER ?? await ask('Team Hub username: ');
const pass = process.env.HUB_PASS ?? await ask('Team Hub password: ', true);
if (!user.trim()) { console.error('Username is required.'); process.exit(1); }
if (pass.length < 10) {
  // HUB_ALLOW_SHORT=1 is for test logins only: short passwords can be guessed offline in minutes.
  if (process.env.HUB_ALLOW_SHORT !== '1') { console.error('The password must be at least 10 characters.'); process.exit(1); }
  console.warn('  ! Short test password. Replace it before putting anything private in the hub.');
}
if (!process.env.HUB_PASS) {
  const again = await ask('Repeat password: ', true);
  if (again !== pass) { console.error('Passwords did not match.'); process.exit(1); }
}

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const material = await crypto.subtle.importKey('raw', enc.encode(user.trim().toLowerCase() + '\u0000' + pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify({ html, files }))));

const b64 = u8 => Buffer.from(u8).toString('base64');
const payload = JSON.stringify({ v: 2, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
const page = readFileSync(OUT, 'utf8');
const re = /(<!-- HUB-DATA:START[^>]*-->\r?\n)[\s\S]*?(\r?\n<!-- HUB-DATA:END -->)/;
if (!re.test(page)) { console.error('Could not find the HUB-DATA markers in team-hub.html'); process.exit(1); }
writeFileSync(OUT, page.replace(re, (m, a, b) => `${a}<script type="application/json" id="hubData">${payload}</script>${b}`));
console.log('Done. team-hub.html is updated. Upload/push it; never upload _private/.');
