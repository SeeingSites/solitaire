# Solitaire

A classic Klondike Solitaire card game built with React, TypeScript, and Vite — now with AI hints, draw-1/draw-3, Vegas scoring, polished visuals, sound effects, and a live timer.

## Features

- Classic Klondike Solitaire (draw 1 or draw 3, toggle anytime)
- Drag-and-drop + click-to-move + double-click to foundation
- **AI Hint system** — suggests the best move using the built-in solver (highlights source & target)
- Auto-complete when all cards are face-up
- Undo / Redo
- Watch Demo mode powered by a strong AI solver
- **Scoring**: Standard (foundations + efficiency) or classic **Vegas** (-52 + 5 per foundation card)
- Dark / light theme
- Responsive design with improved mobile touch targets
- Move counter, live timer, and score
- Web Audio sound effects with mute toggle
- Win cascade celebration + stalemate detection
- Play logging for analysis

## Tech Stack

- React 19 + TypeScript
- Vite
- Zustand
- Tailwind CSS
- @dnd-kit
- Vitest + Playwright (unit + e2e)

## Getting Started

```bash
git clone https://github.com/SeeingSites/solitaire.git
cd solitaire
make setup          # or cd frontend && npm install
make dev            # or cd frontend && npm run dev
# open http://localhost:5173
```

### Testing

```bash
make test                 # unit tests
cd frontend && npm run test:e2e   # Playwright end-to-end
cd frontend && npm run test:sim   # long AI statistical sims
```

### Deploy (one-click)

The repo includes `vercel.json`. Deploy instantly:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `SeeingSites/solitaire`
3. Vercel auto-detects the settings — click Deploy

Or from the command line (after `npm i -g vercel` and `vercel login`):

```bash
make vercel
```

## How to Play

Build four foundation piles (Ace → King by suit). Tableau builds down alternating colors. Kings only on empty tableau. Click stock to draw (1 or 3 cards). Double-click or drag to move. Use **Hint** for an AI suggestion, Undo, Auto Complete, or Watch Demo.

Controls: click / drag / double-click · Undo · Redo · Hint · Auto Complete · Watch Demo · Draw 1/3 · Standard/Vegas scoring · Sound toggle · New Game.

## License

MIT
