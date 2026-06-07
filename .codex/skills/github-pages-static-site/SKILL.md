---
name: github-pages-static-site
description: GitHub Pages static-site workflow guidance. Use when creating, organizing, deploying, updating, or troubleshooting static HTML/CSS/JS sites hosted from a GitHub repository, especially hsr-damage-lab. Covers repo structure, git commit/push flow, Pages settings, deployment checks, and documentation of published URLs.
---

# GitHub Pages Static Site

Use this skill for simple static sites deployed with GitHub Pages.

## Structure

For pure HTML/CSS/JS projects, keep `index.html` at repo root:

```text
project-name/
├── index.html
├── README.md
├── docs/
├── data/
└── assets/
    ├── css/
    └── js/
```

Use relative paths:

```html
<link rel="stylesheet" href="assets/css/styles.css" />
<script type="module" src="assets/js/app.js"></script>
```

## GitHub Pages Settings

```text
Settings > Pages
Source: Deploy from a branch
Branch: main
Folder: /root
```

Do not use GitHub Actions unless the project needs a build step.

## Deployment Workflow

Before pushing:

```powershell
git status --short --branch
git diff --stat
```

Commit and push:

```powershell
git add <changed-files>
git commit -m "Concise message"
git push
```

After pushing, check Pages build if needed. Success means build, report-build-status, and deploy are green.

Published URL for this project:

```text
https://alex9810171.github.io/hsr-damage-lab/
```

## Troubleshooting

- 404 after deploy: wait 1-3 minutes, confirm `index.html` is in repo root, branch is `main`, folder is `/root`.
- CSS/JS missing: verify relative paths and exact filename casing.
- Git missing after install: restart VS Code/terminal and run `git --version`.

## Safety

- Never overwrite an existing remote without checking `git remote -v`.
- Confirm remote URL points to the intended repo before push.
- If the GitHub repo was initialized with files, handle divergent history intentionally rather than force-pushing.
