# Team Hub (members-only page)

`team-hub.html` is a public page, but everything inside it is encrypted. Without
the team username and password, the page source is just scrambled data.

## Add a document, journal, CAD file, instruction, or link

1. Open `_private/team-hub.md` in any text editor (Notepad works).
2. Under the right section, add one line:

   ```
   - Title | link | short note
   ```

   | What you're adding | Example line |
   | --- | --- |
   | Google Doc / Sheet / Drive folder | `- Team handbook \| https://docs.google.com/document/d/... \| Rules and roles` |
   | Onshape CAD with a picture | `- GridLocker full robot \| https://cad.onshape.com/... \| 2026 assembly \| image: gridlocker.png` |
   | A file (PDF, Word, drawing…) | `- Battery care \| battery-care.pdf \| How we charge` (put `battery-care.pdf` in `_private/hub-files/`) |
   | Placeholder for later | `- Wiring standards \| TODO \| coming soon` |
   | Email address | `- Coach Simons \| mailto:tayler.simons@cobbk12.org \| Room 1206` |
   | Plain text, no link | `- Team captains \| \| Ask at a meeting` |

   Start a new section/tab with `# Section name`, and give it a description with
   a `> text` line right under it. The link type (Google Doc, Onshape, PDF, GitHub…)
   is detected automatically.
3. Double-click **`update-team-hub.bat`** (or run `node tools/build-team-hub.mjs`).
   It asks for the team username and password, then rebuilds `team-hub.html`.
4. Publish the new `team-hub.html` (commit + push if the site is on GitHub).

If you make a typo in the list, the build stops and tells you the line number.

## Change the login

Run the build again and type a new username/password. Everyone then uses the new one.
Do this when people leave the team.

## Rules

- **Never upload or commit `_private/`.** It's the readable version (git ignores it).
- **Files in `hub-files/` are encrypted into the page**, so they stay private, but
  they make the page bigger. Keep each under ~5 MB and the total under 20 MB.
  Big things (videos, full CAD exports) belong in Google Drive. Share them with
  the team only, and link to them.
- **Use a long password** (a short phrase, 14+ characters). Someone could download
  the page and try to guess offline, so a long password is the real protection.
- Everyone shares one login. This is not a per-person account system.
- The unlock needs `https://` (GitHub Pages is fine) or `localhost`.
