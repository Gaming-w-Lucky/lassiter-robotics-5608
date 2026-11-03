# Team Hub (members-only page)

`team-hub.html` is a public page, but what's inside it is encrypted. Without the
team username and password, the page source only contains scrambled data.

## Change what's in the hub, or change the login

1. Edit `_private/team-hub-content.html` (plain HTML, uses the site's styles).
2. From the website folder, run:

   ```
   node tools/build-team-hub.mjs
   ```

   Enter the username and password you want. Running it again with a new
   password changes the login for everyone.
3. Upload the new `team-hub.html`.

## Rules

- **Never upload `_private/`.** It's the readable version. (It is git-ignored.)
- **Link to files, don't upload them.** A PDF placed in the website folder is
  public to anyone who guesses its URL. Put documents in Google Drive, share them
  with the team only, and link to them from the hub.
- **Use a long password** (a short phrase, 14+ characters). The page can be
  downloaded and guessed offline, so a long password is the real protection.
- **Change it when people leave the team.** Re-run the build with a new password.
- This keeps the hub private from the public. It is not a per-person account
  system; everyone shares one login.
- The site needs to be served over `https://` (GitHub Pages, Netlify, etc.) for
  the unlock to work. Opening the file directly from your computer also works.
