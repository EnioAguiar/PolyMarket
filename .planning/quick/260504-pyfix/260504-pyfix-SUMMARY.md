---
status: complete
date: 2026-05-04
commit: 63ffd9ff
---

# Quick Task 260504-pyfix: Complete

## Summary

Created minimal `railpack.json` that:
1. Removes `packages.python` (avoids mise install that fails)
2. Keeps Node.js build steps (npm ci, npm run build)
3. Deploy command: `pip install -r requirements.txt && npm start`

## Changes

- **railpack.json**: New minimal config with proper schema and deploy command

## Result

Railway will now:
- Use Python 3.13 from base image (no mise install)
- Install Python packages via pip in deploy step
- Keep Node.js for TypeScript compilation

## Next Step

Redeploy Railway and check if build succeeds.