# Solitaire

A classic Klondike Solitaire card game built with React, TypeScript, and Vite.

## Features

- Classic Klondike Solitaire gameplay
- Drag-and-drop card movement
- Auto-complete functionality
- Undo/redo support
- Dark/light theme
- Responsive design
- Move counter
- Win detection

## Tech Stack

- React 18
- TypeScript
- Vite
- Zustand (state management)
- Tailwind CSS
- Framer Motion (animations)
- @dnd-kit (drag and drop)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd solitaire

# Install dependencies
make setup
# or
cd frontend && npm install
```

### Development

```bash
# Start development server
make dev
# or
cd frontend && npm run dev

# Open http://localhost:5173 in your browser
```

### Building for Production

```bash
# Build for production
make build
# or
cd frontend && npm run build

# Preview production build
make preview
# or
cd frontend && npm run preview
```

### Testing

```bash
# Run unit tests
make test
# or
cd frontend && npm test

# Run linting
make lint
# or
cd frontend && npm run lint
```

### Docker

```bash
# Build Docker image
make docker-build
# or
cd frontend && docker build -t solitaire .

# Run Docker container
make docker-run
# or
cd frontend && docker run -p 8080:80 solitaire

# Open http://localhost:8080 in your browser
```

## How to Play

### Rules

1. **Objective**: Move all cards to the four foundation piles, organized by suit from Ace to King.

2. **Tableau**: There are 7 tableau piles. Cards can be moved between tableau piles in descending order and alternating colors (e.g., red 6 on black 7).

3. **Foundations**: Build up by suit from Ace to King. Only Kings can be placed on empty foundations.

4. **Stock**: Click to draw cards. Cards are drawn one at a time to the waste pile.

5. **Waste**: The top card from the waste can be moved to tableau or foundation piles.

6. **Empty Tableau**: Only Kings can be placed on empty tableau piles.

7. **Auto-Complete**: When all cards are face-up, the game can auto-complete by moving all remaining cards to foundations.

### Controls

- **Click**: Select a card
- **Click destination**: Move selected card
- **Drag and Drop**: Drag cards to move them
- **Undo**: Undo last move
- **Redo**: Redo undone move
- **Auto Complete**: Automatically move all possible cards to foundations
- **New Game**: Start a new game

## Project Structure

```
solitaire/
├── frontend/
│   ├── src/
│   │   ├── game/           # Core game logic
│   │   │   ├── types.ts    # Type definitions
│   │   │   ├── constants.ts # Game constants
│   │   │   ├── Deck.ts     # Card and deck utilities
│   │   │   └── Klondike.ts # Klondike engine
│   │   ├── components/     # React components
│   │   │   ├── Card.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── StockPile.tsx
│   │   │   ├── WastePile.tsx
│   │   │   ├── FoundationPile.tsx
│   │   │   └── TableauPile.tsx
│   │   ├── store/          # Zustand store
│   │   │   └── useGameStore.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tsconfig.json
├── Makefile
├── README.md
└── .gitignore
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run unit tests
- `npm run lint` - Run ESLint
- `npm run format` - Run Prettier

### Make Commands

- `make setup` - Full initial setup
- `make dev` - Start development server
- `make build` - Production build
- `make test` - Run all tests
- `make lint` - Run ESLint
- `make format` - Run Prettier
- `make docker-build` - Build Docker image
- `make docker-run` - Run Docker container
- `make clean` - Remove build artifacts
- `make vercel` - Deploy to Vercel

## License

MIT
