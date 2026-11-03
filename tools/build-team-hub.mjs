#!/usr/bin/env node
/*
  Encrypts _private/team-hub-content.html into team-hub.html.

    node tools/build-team-hub.mjs
      -> asks for the team username and password

    HUB_USER=... HUB_PASS=... node tools/build-team-hub.mjs
      -> non-interactive

  The browser side (in team-hub.html) must use the same scheme:
  PBKDF2-SHA256(lowercase(trim(user)) + "\0" + password, salt, ITER) -> AES-256-GCM.
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '_private', 'team-hub-content.html');
const OUT = join(ROOT, 'team-hub.html');
const ITER = 600000;

function ask(question, hidden) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

const user = process.env.HUB_USER ?? await ask('Team Hub username: ');
const pass = process.env.HUB_PASS ?? await ask('Team Hub password: ', true);
if (!user.trim() || pass.length < 10) {
  console.error('Username is required and the password must be at least 10 characters.');
  process.exit(1);
}
if (!process.env.HUB_PASS) {
  const again = await ask('Repeat password: ', true);
  if (again !== pass) { console.error('Passwords did not match.'); process.exit(1); }
}

const html = readFileSync(SRC, 'utf8').replace(/^\s*<!--[\s\S]*?-->\s*/, '');  // drop the private header comment
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const material = await crypto.subtle.importKey('raw', enc.encode(user.trim().toLowerCase() + '\u0000' + pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(html)));

const b64 = u8 => Buffer.from(u8).toString('base64');
const payload = JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) });

const page = readFileSync(OUT, 'utf8');
const re = /(<!-- HUB-DATA:START[^>]*-->\r?\n)[\s\S]*?(\r?\n<!-- HUB-DATA:END -->)/;
if (!re.test(page)) { console.error('Could not find the HUB-DATA markers in team-hub.html'); process.exit(1); }
writeFileSync(OUT, page.replace(re, (m, a, b) => `${a}<script type="application/json" id="hubData">${payload}</script>${b}`));
console.log(`Encrypted ${html.length.toLocaleString()} characters into team-hub.html. Upload team-hub.html; never upload _private/.`);
