# Solitaire

A classic Klondike Solitaire card game built with React, TypeScript, and Vite — now with polished visuals, sound effects, scoring, and a live timer.

## Features

- Classic Klondike Solitaire gameplay (draw 1)
- Drag-and-drop + click-to-move + double-click to foundation
- Auto-complete when all cards are face-up
- Undo / Redo
- Watch Demo mode powered by a strong AI solver
- Dark / light theme
- Responsive design (mobile-friendly card sizing)
- Move counter, live timer, and score (foundations + efficiency)
- Web Audio sound effects (click, move, foundation, win) with mute toggle
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
make test           # unit tests
cd frontend && npm run test:e2e   # Playwright end-to-end
cd frontend && npm run test:sim   # long AI statistical sims
```

### Deploy

```bash
make vercel         # or connect the repo to Vercel
```

## How to Play

Build four foundation piles (Ace → King by suit). Tableau builds down alternating colors. Kings only on empty tableau. Click stock to draw. Double-click or drag to move. Use Undo, Auto Complete, or Watch Demo.

Controls: click / drag / double-click · Undo · Redo · Auto Complete · Watch Demo · Sound toggle · New Game.

## License

MIT
