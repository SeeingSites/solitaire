export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type CardLocation =
  | { type: "stock" }
  | { type: "waste" }
  | { type: "foundation"; index: number }
  | { type: "tableau"; pileIndex: number; cardIndex: number };

export type MoveRecord = {
  card: Card;
  from: CardLocation;
  to: CardLocation;
  flippedCard?: Card;
  cardCount: number;
};

export interface SolitaireState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  moveCount: number;
  isComplete: boolean;
  lastActionLog: string[];
}

export type GameVariant = "klondike";

export interface SolitaireEngine {
  variant: GameVariant;
  initGame(): void;
  getState(): SolitaireState;
  drawFromStock(): boolean;
  moveCard(from: CardLocation, to: CardLocation): boolean;
  autoComplete(): boolean;
  canAutoComplete(): boolean;
  isWon(): boolean;
  findLegalMoves(): Array<{ from: CardLocation; to: CardLocation }>;
  getHistory(): MoveRecord[];
  undo(): boolean;
  redo(): boolean;
}
