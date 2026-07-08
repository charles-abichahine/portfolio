# Charles Abi Chahine — Portfolio

Architect & computational designer. MaCAD, IAAC.

## Structure

- `site/` — the website: React + Vite + Tailwind CSS v4. Deployed to GitHub Pages
  automatically on every push to `main` via `.github/workflows/deploy.yml`.
- `portfolio-projects/` — raw project source material (models, decks, full-res media).
  **Git-ignored** — stays local. The site uses web-optimized copies in `site/public/`.
- `old-materials/` — CV base, previous portfolio, old logo. Also git-ignored.

## Development

```bash
cd site
npm install
npm run dev
```

## Content

Projects live as data in `site/src/data/projects.js`; CV content in `site/src/data/cv.js`.
Adding a project = adding an entry there plus optimized images under
`site/public/projects/<slug>/`.

## Deploy setup (once)

In the GitHub repo: Settings → Pages → Source: **GitHub Actions**.
