---
status: in-progress
date: 2026-05-04
slug: pyfix
---

# Quick Task 260504-pyfix: Fix Railpack Python Detection

## Context

Railway build fails because Railpack tries to install Python via `mise` (git clone from GitHub). Railway network blocks GitHub.

**Goal:** Fix so Railpack auto-detects Python from base image instead of forcing mise install.

## Solution

Create minimal `railpack.json` that:
1. Does NOT specify `packages.python` (avoids mise install)
2. Keeps Node.js build steps
3. Adds `pip install -r requirements.txt` to deploy command as backup

## Tasks

### Task 1: Create railpack.json

**Files:** `railpack.json` (new)

**Action:**
```json
{
  "$schema": "https://schema.railpack.com",
  "steps": {
    "install": {
      "commands": ["npm ci"]
    },
    "build": {
      "commands": ["npm run build"]
    }
  },
  "deploy": {
    "command": "pip install -r requirements.txt && npm start"
  }
}
```

**Verify:** Check file exists with correct content

### Task 2: Commit and push

**Action:** `git add railpack.json && git commit -m "fix: minimal railpack.json to avoid mise python install" && git push`

## What This Solves

- Railpack will NOT force `mise install python@3.13`
- Node.js steps preserved (npm ci, npm run build)
- Python packages (crawl4ai, tweepy, praw) install via pip in deploy step
- Uses Python 3.13 already in container base image

## Done

Plan created, ready to execute.