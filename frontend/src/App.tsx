import GameBoard from "./components/GameBoard";
import { useGameStore } from "./store/useGameStore";

function App() {
  const { theme, toggleTheme, startGame } = useGameStore();

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-6 gap-2 sm:gap-4">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-wider text-amber-500 uppercase font-display">
            Solitaire
          </h1>

          <div className="flex gap-2 items-center">
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-lg text-sm font-medium
                       bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white
                       transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={startGame}
              className="px-4 py-1.5 rounded-lg text-sm font-bold
                       bg-green-600 hover:bg-green-500 text-white
                       transition-colors"
            >
              New Game
            </button>
          </div>
        </header>

        {/* Game Board */}
        <GameBoard />

        {/* Footer */}
        <footer className="text-center text-gray-500 text-xs mt-8">
          Classic Klondike Solitaire
        </footer>
      </div>
    </div>
  );
}

export default App;
