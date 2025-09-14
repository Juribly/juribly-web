# AGENTS.md — juribly-web

## Stack & setup
- Node 20.x, npm preferred.
- Frontend: Vite + React (dev: npm run dev).
- Realtime/game: @react-three/fiber + drei.
- Backend proxy/dev server (if any) in server/.

## How to run locally
1) npm install
2) npm run lint && npm run typecheck
3) npm test
4) npm run dev  # port 5173 (fallback 5175)

## Coding rules
- Return **full-file replacements** in patches.
- Camera must never clip floor/walls; audience auto-seated.
- Fix emotes (no arm-through-body) + judge wig stability.
- Add/extend tests for camera & emotes.
- Never print .env or secrets.

## Paths
- src/three/, src/components/, src/hooks/
- Networking: src/lib/socket.js
- Player/camera: src/three/avatars/, src/three/camera/

## Done criteria
- Tests pass; lint + typecheck clean.
- PR description with rationale and screenshots (if UI).
