# TD SPA - WordPress Single Page Application Plugin

> Instant page loads with zero full-page reload, AJAX navigation, persistent audio/video players, edge caching, and prefetch. Built for radio stations, podcast networks, media sites, and ultra-fast WordPress websites.

---

## 📌 Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Prerequisites](#prerequisites)
3. [All Available Commands](#all-available-commands)
4. [Development & Workflow](#development--workflow)
5. [Release & Packaging Guide](#release--packaging-guide)
   - [Files to Include in Zip / Distribution](#files-to-include-in-zip--distribution)
   - [Files to Exclude from Zip](#files-to-exclude-from-zip)
   - [Zip Commands (PowerShell, Bash, Git Archive)](#zip-packaging-commands)
6. [Project Directory Structure](#project-directory-structure)
7. [Troubleshooting & Gotchas](#troubleshooting--gotchas)

---

## 🚀 Overview & Architecture

* **Frontend Engine:** Intercepts link navigations, maintains continuous audio/video playback (`#td-spa-persist`), updates the browser URL bar via History API (`pushState`/`replaceState`), and updates SEO metadata (canonical, title, OpenGraph, JSON-LD) on every route.
* **Page Builder Safeguards:** Automatically steps aside when visual page builders (Elementor, Divi, Bricks, Beaver Builder, Oxygen, Breakdance, etc.) or the WordPress Customizer are active.
* **SEO & Bot Safety:** Server-side crawler detection automatically bypasses the SPA shell for search engine spiders (Googlebot, Bingbot, etc.), serving raw, native server-rendered HTML.
* **Admin Dashboard:** SolidJS/React-driven settings panel with Cloudflare edge-cache integration, loader styling, and onboarding tour.

---

## 🛠 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PHP**: 7.1 or higher (WordPress 5.3+ to 6.7+)

---

## 💻 All Available Commands

Install dependencies first:
```bash
npm install
```

### Build Commands (Production)
| Command | Action | Output Files |
| :--- | :--- | :--- |
| `npm run build` | Builds both Frontend and Admin production bundles | `public/js/*`, `public/css/*` |
| `npm run build:frontend` | Compiles only the frontend script and stylesheet | `public/js/td-spa.min.js`, `public/css/td-spa.min.css` |
| `npm run build:admin` | Compiles only the admin dashboard SPA bundle | `public/js/admin.min.js`, `public/css/admin.min.css` |

### Development / Watch Mode
| Command | Action |
| :--- | :--- |
| `npm run frontend` | Watches `src/frontend/` and automatically recompiles on changes |
| `npm run admin` | Watches `src/admin/` and automatically recompiles on changes |

### Quality & Testing Commands
| Command | Action |
| :--- | :--- |
| `npm test` | Runs JS unit tests + PHP test suite |
| `npm run test:php` | Executes PHP syntax and test runners across `tests/` |
| `npm run test:browser` | Launches headless browser test suite |
| `npm run report` | Runs PHP_CodeSniffer (`phpcs`) and outputs to `report.txt` |

---

## 📦 Release & Packaging Guide

Before packaging the plugin for WordPress installation or marketplace distribution, **always compile the production assets**:
```bash
npm run build
```

---

### Files to Include in Zip / Distribution

Your final distributed plugin zip must contain the following directories and files:

```
td-spa/
├── td-spa.php               # Main plugin bootstrapper
├── readme.txt               # WordPress.org plugin directory readme
├── changelog.txt            # Version history
├── index.php                # Security silence file
├── package.json             # Source dependency reference
├── assets/                  # Core static assets & PackEdge SDK
│   └── js/
├── includes/                # All backend PHP architecture
│   ├── admin/
│   ├── classes/
│   ├── cloudflare/
│   ├── common/
│   └── class-boot.php
├── public/                  # Compiled production JS, CSS, and loader images
│   ├── css/
│   ├── images/
│   └── js/
├── src/                     # Source JS/CSS (recommended by WP for GPL compliance)
│   ├── admin/
│   ├── frontend/
│   └── shared/
└── templates/               # Frontend template partials
    ├── loader.php
    └── progressbar.php
```

---

### Files to Exclude from Zip

The following folders and temporary files **MUST NOT** be included in your distributable zip:

| Path / Pattern | Reason to Exclude |
| :--- | :--- |
| `node_modules/` | Development dependencies (heavy; 50MB+; breaks installation) |
| `.git/` & `.gitignore` | Version control repository and git metadata |
| `.gemini/` / `.agents/` / `.vscode/` | IDE configurations and AI assistant workspaces |
| `tests/` | Test suites, test runners, and test fixtures |
| `*.log` / `report.txt` | Debug logs, npm debug logs, and phpcs report files |
| `package-lock.json` | Lockfile not required inside production zip (unless desired) |
| `*.map` (Optional) | Source maps (`public/js/*.map`) can be stripped to reduce zip size |

---

### Zip Packaging Commands

Run any of the following commands from your project root:

#### A. PowerShell (Windows Native)
```powershell
# 1. Ensure build is fresh
npm run build

# 2. Package into a zip excluding unnecessary files
$exclude = @('node_modules', '.git', '.vscode', '.gemini', 'tests', '*.log', 'report.txt')
Get-ChildItem -Path . -Exclude $exclude | Compress-Archive -DestinationPath ..\td-spa.zip -Force
```

#### B. Git Archive (Fastest & Cleanest if committed)
```bash
git archive -o ../td-spa.zip HEAD
```
*(Note: If using `git archive`, make sure `public/js/` and `public/css/` are committed in git).*

#### C. Command Line Zip (Bash / Mac / Linux / Git Bash)
```bash
npm run build
zip -r ../td-spa.zip . -x "node_modules/*" ".git/*" ".vscode/*" ".gemini/*" "tests/*" "*.log" "report.txt" "*.map"
```

---

## 🗂 Project Directory Structure

```
TDSPA/
├── assets/                  # Static scripts (e.g. diagnostics)
├── includes/
│   ├── admin/               # Admin menus, hooks, rest endpoints, and rating prompts
│   ├── classes/             # Enqueue scripts, template loader, upgrade routines
│   ├── cloudflare/          # Cloudflare API client, cache purge hooks, OAuth relay
│   ├── common/              # Base classes & plugin option defaults
│   └── class-boot.php       # Core class loader
├── public/                  # Minified production assets (CSS, JS, images)
├── src/
│   ├── admin/               # SolidJS admin dashboard interface
│   ├── frontend/            # SPA navigation, iframe container & player persistence
│   └── shared/              # Shared utility helpers
├── templates/               # Loader and progressbar HTML templates
├── td-spa.php               # Main plugin entrance
├── package.json             # Build toolchain & scripts
└── readme.txt               # WordPress.org standard metadata
```

---

## 💡 Troubleshooting & Gotchas

1. **Initial Page Load:** The plugin smoothly loads the native server-rendered page and initializes the client container seamlessly without blank screen flashes.
2. **Page Builders:** Visual builders like Elementor, Bricks, or Divi are automatically detected via URL query parameters and bypassed so editing is unaffected.
3. **Audio / Video Dropouts:** Ensure your persistent audio player has the selector `[data-td-spa-persist]` or `.td-spa-persist` to guarantee that playback survives navigation hops.
4. **Cloudflare Cache Purge:** When posts or pages are updated, the built-in Cloudflare module automatically triggers edge purge requests.
