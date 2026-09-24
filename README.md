# Portfolio — Jui Cheng Ho

A static, single-page portfolio. No framework, no build step, no dependencies to install.

```
index.html      all content
styles.css      light + dark theme (CSS variables)
main.js         theme toggle, scroll reveal, active nav link
assets/         images used by the page
```

## Run it locally

```bash
python3 .claude/serve.py 4180
```

Then open <http://localhost:4180>.

That wrapper is a plain static server with caching switched off. The stock
`python3 -m http.server` works too, but embedded preview panes will happily
hold a stale `styles.css` or `main.js` for a whole session, which makes edits
look like they did nothing.

Opening `index.html` directly as a `file://` URL also mostly works, but a local
server is closer to how it will actually be hosted.

## Before you publish — things to fill in

1. **Medium link** — in the *Writing* section, the button currently points at
   `https://medium.com/`. Replace it with your profile URL and delete the
   `<p class="writing__todo">` paragraph above it (it's marked with a `TODO`
   comment in `index.html`).

2. **Two things to double-check against your CV:**
   - The hackathon project is called **Sentinel** here, because that is the name
     in the repo's own README. Your `Resume_HoJuiCheng.pdf` calls it **ReguLens**.
     Pick one and make both match, so an interviewer doesn't see two names.
   - The **"cut latency by 50%"** line under Neurowatt comes from `ukResume_6.pdf`.
     Your newer `Resume_HoJuiCheng.pdf` dropped it. If that removal was deliberate,
     delete the line here too.

3. **Hero portrait** — the right-hand column of the hero expects
   `assets/portrait.jpg`. Save the Glenfinnan photo anywhere, then run:

   ```bash
   python3 .claude/crop-portrait.py ~/Downloads/your-photo.jpg
   ```

   That writes a 4:5 half-body crop (just above the head down to the hands) at
   1000x1250. The crop box is stored as fractions of the source in
   `.claude/crop-portrait.py`, so it works on the phone copy or the
   full-resolution original — nudge `BOX` there if the framing is off.
   Until the file exists the hero simply renders one column, no broken image.

4. **AWS certificate** — the card shows the credential ID only. If you want a
   verifiable link, add your Credly badge URL as an anchor around the ID.

## Deploy

Any static host works. Push the folder to a GitHub repo, then either:

- **GitHub Pages** — repo *Settings → Pages → Deploy from a branch → `main` / root*.
- **Vercel** — `vercel --prod` from this folder, or import the repo. No build
  command, output directory is the root.
- **Netlify** — drag the folder onto the dashboard.

## Notes

- The visual language is neo-brutalist: every panel is a flat block with a
  `var(--bw)` outline in `var(--edge)` and a hard `var(--pop)` offset shadow —
  no blur anywhere. Hover presses a block into its own shadow rather than
  lifting it. To retune the whole page, change `--edge`, `--bw` and `--pop` in
  `:root`; almost nothing hard-codes a border or shadow.
- `--edge` flips from near-black to near-white in dark mode, because a black
  outline is invisible on a dark page. `--on-accent` flips with it, so text on
  an accent-filled block (nav pill, section number, award) stays legible.
- Dark mode follows the OS by default and can be overridden with the toggle
  (stored in `localStorage`). An inline script in `<head>` applies the stored
  theme before first paint so it never flashes the wrong one.
- Work Experience is a three-step journey diagram, not a CV list. Each step's
  dashed rail is a flex child of its head row with a negative end margin, so its
  length comes from the grid rather than hard-coded offsets — it stays correct
  at any width, and turns vertical under 860px.
- The hero copy is split into its rendered lines by `main.js`, so each line
  rises into place in sequence. The split depends on webfont metrics and on the
  measuring width, neither of which has a single reliable "ready" moment, so it
  re-runs when either changes. Two traps worth knowing if you touch it: the
  element must be emptied before the word spans are measured (otherwise the
  text is measured doubled) and words are split at hyphens, because a browser
  can break a line after one.
- Blocks slide in from a direction set by `data-reveal` on the element, and
  `--i` staggers siblings. The resting-position rules must stay *above*
  `.is-visible` in the stylesheet: they have equal specificity, so if a
  direction rule came last, cards would fade in but never slide into place.
- Sections fade in as they enter the viewport and back out as they leave. Under
  *prefers-reduced-motion: reduce* the crossfade is kept but the vertical travel
  is dropped, so the effect still reads without anything sliding.
- The reveal is driven by a plain scroll handler measuring rects, plus a 150 ms
  polling fallback — not IntersectionObserver. IO and requestAnimationFrame are
  both paused while a document reports itself hidden, which is what some
  embedded preview panes do even while on screen, and that left the page frozen
  at opacity 0. If you ever refactor this, keep the fallback.
- The reveal styles are scoped to `.js`, so with JavaScript disabled the page
  still renders fully rather than staying blank.
- Fonts — **Bricolage Grotesque** for headings, **Manrope** for body text and
  **JetBrains Mono** for labels — load from Google Fonts; everything else is local.
- `assets/ukfin-team.jpg` is a downscaled copy of the original photo. It shows
  other people — if any teammate would rather not appear on a public page,
  remove the `<figure class="shot shot--team">` block.
- `.claude/launch.json` just tells the editor's preview pane how to serve the
  folder; it isn't needed for deployment.
