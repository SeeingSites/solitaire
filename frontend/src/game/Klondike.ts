import { SolitaireEngine, SolitaireState, Card, CardLocation, MoveRecord } from "./types";
import { createDeck, shuffleDeck, canStackOnTableau, canStackOnFoundation } from "./Deck";
import { FOUNDATION_SUITS } from "./constants";

export class KlondikeEngine implements SolitaireEngine {
  variant = "klondike" as const;

  private stock: Card[] = [];
  private waste: Card[] = [];
  private foundations: Card[][] = [[], [], [], []];
  private tableau: Card[][] = [[], [], [], [], [], [], []];
  private history: MoveRecord[] = [];
  private future: MoveRecord[] = [];
  private moveCount = 0;
  private lastActionLog: string[] = [];

  constructor() {
    this.initGame();
  }

  initGame(): void {
    this.stock = shuffleDeck(createDeck());
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.history = [];
    this.future = [];
    this.moveCount = 0;
    this.lastActionLog = [];

    // Deal cards to tableau
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = this.stock.pop();
        if (card) {
          card.faceUp = j === i;
          this.tableau[j].push(card);
        }
      }
    }

    this.log("Game started");
  }

  getState(): SolitaireState {
    return {
      stock: [...this.stock],
      waste: [...this.waste],
      foundations: this.foundations.map((pile) => [...pile]),
      tableau: this.tableau.map((pile) => [...pile]),
      moveCount: this.moveCount,
      isComplete: this.isWon(),
      lastActionLog: [...this.lastActionLog],
    };
  }

  drawFromStock(): boolean {
    if (this.stock.length === 0) {
      // Reshuffle waste into stock
      this.stock = this.waste.reverse().map((card) => ({ ...card, faceUp: false }));
      this.waste = [];
      this.log("Reshuffled waste into stock");
    }

    const card = this.stock.pop();
    if (!card) return false;

    card.faceUp = true;
    this.waste.push(card);
    this.future = [];
    this.moveCount++;
    this.log(`Drew ${card.rank}${card.suit[0].toUpperCase()}`);
    return true;
  }

  moveCard(from: CardLocation, to: CardLocation): boolean {
    const cards = this.getCardsAtLocation(from);
    if (!cards || cards.length === 0) return false;

    const card = cards[0];

    if (!this.isValidMove(card, to)) return false;

    // Record move for undo
    const move: MoveRecord = {
      card: { ...card },
      from: { ...from },
      to: { ...to },
      cardCount: cards.length,
    };

    // Remove cards from source
    this.removeCardsFromLocation(from, cards.length);

    // Add cards to destination
    this.addCardsToLocation(to, cards);

    // Flip top card of tableau if needed
    if (from.type === "tableau") {
      const sourcePile = this.tableau[from.pileIndex];
      if (sourcePile.length > 0) {
        const topCard = sourcePile[sourcePile.length - 1];
        if (!topCard.faceUp) {
          topCard.faceUp = true;
          move.flippedCard = { ...topCard };
        }
      }
    }

    this.history.push(move);
    this.future = [];
    this.moveCount++;
    this.log(`Moved ${card.rank}${card.suit[0].toUpperCase()} to ${this.getLocationName(to)}`);
    return true;
  }

  autoComplete(): boolean {
    let moved = true;
    while (moved) {
      moved = false;

      // Check waste pile
      if (this.waste.length > 0) {
        const card = this.waste[this.waste.length - 1];
        for (let i = 0; i < 4; i++) {
          if (this.isValidMove(card, { type: "foundation", index: i })) {
            this.moveCard({ type: "waste" }, { type: "foundation", index: i });
            moved = true;
            break;
          }
        }
      }

      // Check tableau piles
      for (let i = 0; i < 7; i++) {
        const pile = this.tableau[i];
        if (pile.length > 0) {
          const card = pile[pile.length - 1];
          for (let j = 0; j < 4; j++) {
            if (this.isValidMove(card, { type: "foundation", index: j })) {
              this.moveCard(
                { type: "tableau", pileIndex: i, cardIndex: pile.length - 1 },
                { type: "foundation", index: j },
              );
              moved = true;
              break;
            }
          }
        }
      }
    }
    return this.isWon();
  }

  canAutoComplete(): boolean {
    // Check if any card can be moved to foundation
    if (this.waste.length > 0) {
      const card = this.waste[this.waste.length - 1];
      for (let i = 0; i < 4; i++) {
        if (this.isValidMove(card, { type: "foundation", index: i })) {
          return true;
        }
      }
    }

    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        for (let j = 0; j < 4; j++) {
          if (this.isValidMove(card, { type: "foundation", index: j })) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isWon(): boolean {
    return this.foundations.every((pile) => pile.length === 13);
  }

  findLegalMoves(): Array<{ from: CardLocation; to: CardLocation }> {
    const moves: Array<{ from: CardLocation; to: CardLocation }> = [];

    // Check waste → foundation and waste → tableau
    if (this.waste.length > 0) {
      const wasteCard = this.waste[this.waste.length - 1];
      const from: CardLocation = { type: "waste" };

      // Waste → foundation
      for (let i = 0; i < 4; i++) {
        if (this.isValidMove(wasteCard, { type: "foundation", index: i })) {
          moves.push({ from, to: { type: "foundation", index: i } });
        }
      }

      // Waste → tableau
      for (let i = 0; i < 7; i++) {
        if (this.isValidMove(wasteCard, { type: "tableau", pileIndex: i, cardIndex: 0 })) {
          moves.push({ from, to: { type: "tableau", pileIndex: i, cardIndex: 0 } });
        }
      }
    }

    // Check each tableau pile
    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      // Find the first face-up card in this pile
      let firstFaceUp = -1;
      for (let j = 0; j < pile.length; j++) {
        if (pile[j].faceUp) {
          firstFaceUp = j;
          break;
        }
      }

      if (firstFaceUp === -1) continue;

      // Tableau pile → foundation (only top card can go to foundation)
      const topCard = pile[pile.length - 1];
      for (let f = 0; f < 4; f++) {
        if (this.isValidMove(topCard, { type: "foundation", index: f })) {
          moves.push({
            from: { type: "tableau", pileIndex: i, cardIndex: pile.length - 1 },
            to: { type: "foundation", index: f },
          });
        }
      }

      // Tableau pile → other tableau piles (support multi-card subsequences)
      // For each face-up card position, check if cards from there to end form a valid descending sequence
      for (let cardIdx = firstFaceUp; cardIdx < pile.length; cardIdx++) {
        const movingCard = pile[cardIdx];

        // Check if cards from cardIdx to end form a valid alternating-color descending sequence
        if (!this.isValidSubsequence(pile, cardIdx)) continue;

        // Try moving this subsequence to each other tableau pile
        for (let j = 0; j < 7; j++) {
          if (i === j) continue;
          if (this.isValidMove(movingCard, { type: "tableau", pileIndex: j, cardIndex: 0 })) {
            moves.push({
              from: { type: "tableau", pileIndex: i, cardIndex: cardIdx },
              to: { type: "tableau", pileIndex: j, cardIndex: 0 },
            });
          }
        }
      }
    }

    return moves;
  }

  // Check if cards from startIdx to end of pile form a valid descending alternating-color sequence
  private isValidSubsequence(pile: Card[], startIdx: number): boolean {
    for (let k = startIdx + 1; k < pile.length; k++) {
      if (!canStackOnTableau(pile[k], pile[k - 1])) {
        return false;
      }
    }
    return true;
  }

  getHistory(): MoveRecord[] {
    return [...this.history];
  }

  undo(): boolean {
    if (this.history.length === 0) return false;

    const move = this.history.pop()!;

    // Get the cards from the destination before removing them (for multi-card support)
    const movedCards = this.getLastNCardsFromLocation(move.to, move.cardCount);

    // Remove cards from destination (always from the end, since cards are pushed to the end)
    switch (move.to.type) {
      case "stock":
        this.stock.splice(this.stock.length - move.cardCount, move.cardCount);
        break;
      case "waste":
        this.waste.splice(this.waste.length - move.cardCount, move.cardCount);
        break;
      case "foundation":
        this.foundations[move.to.index].splice(
          this.foundations[move.to.index].length - move.cardCount,
          move.cardCount,
        );
        break;
      case "tableau":
        this.tableau[move.to.pileIndex].splice(
          this.tableau[move.to.pileIndex].length - move.cardCount,
          move.cardCount,
        );
        break;
    }

    // Add cards back to source in correct order
    if (move.from.type === "tableau") {
      // For tableau, insert all cards at the original position
      this.tableau[move.from.pileIndex].splice(move.from.cardIndex, 0, ...movedCards);
    } else if (move.from.type === "foundation") {
      this.foundations[move.from.index].push(...movedCards);
    } else if (move.from.type === "waste") {
      this.waste.push(...movedCards);
    } else if (move.from.type === "stock") {
      this.stock.push(...movedCards);
    }

    // Unflip card if one was flipped
    if (move.flippedCard && move.from.type === "tableau") {
      const sourcePile = this.tableau[move.from.pileIndex];
      const flipIndex = move.from.cardIndex - 1;
      if (flipIndex >= 0 && flipIndex < sourcePile.length) {
        sourcePile[flipIndex].faceUp = false;
      }
    }

    this.future.push(move);
    this.moveCount--;
    this.log(`Undid move`);
    return true;
  }

  redo(): boolean {
    if (this.future.length === 0) return false;

    const move = this.future.pop()!;

    // Get cards from source
    const cards = this.getCardsAtLocation(move.from);
    if (!cards || cards.length === 0) return false;

    // Remove from source (handle multi-card moves)
    this.removeCardsFromLocation(move.from, move.cardCount);

    // Add to destination
    this.addCardsToLocation(move.to, cards);

    // Flip card if needed
    if (move.from.type === "tableau") {
      const sourcePile = this.tableau[move.from.pileIndex];
      if (sourcePile.length > 0) {
        const topCard = sourcePile[sourcePile.length - 1];
        if (!topCard.faceUp) {
          topCard.faceUp = true;
        }
      }
    }

    this.history.push(move);
    this.moveCount++;
    this.log(`Redid move`);
    return true;
  }

  private isValidMove(card: Card, to: CardLocation): boolean {
    switch (to.type) {
      case "foundation":
        return canStackOnFoundation(card, this.foundations[to.index], FOUNDATION_SUITS[to.index]);
      case "tableau": {
        const targetPile = this.tableau[to.pileIndex];
        if (targetPile.length === 0) {
          return card.rank === "K";
        }
        return canStackOnTableau(card, targetPile[targetPile.length - 1]);
      }
      case "waste":
        return false;
      case "stock":
        return false;
      default:
        return false;
    }
  }

  private getCardsAtLocation(location: CardLocation): Card[] | null {
    switch (location.type) {
      case "stock":
        return this.stock.length > 0 ? [this.stock[this.stock.length - 1]] : null;
      case "waste":
        return this.waste.length > 0 ? [this.waste[this.waste.length - 1]] : null;
      case "foundation":
        return this.foundations[location.index].length > 0
          ? [this.foundations[location.index][this.foundations[location.index].length - 1]]
          : null;
      case "tableau": {
        const pile = this.tableau[location.pileIndex];
        if (location.cardIndex >= pile.length) return null;
        return pile.slice(location.cardIndex);
      }
      default:
        return null;
    }
  }

  private getLastNCardsFromLocation(location: CardLocation, count: number): Card[] {
    switch (location.type) {
      case "stock":
        return this.stock.slice(this.stock.length - count);
      case "waste":
        return this.waste.slice(this.waste.length - count);
      case "foundation":
        return this.foundations[location.index].slice(
          this.foundations[location.index].length - count,
        );
      case "tableau":
        return this.tableau[location.pileIndex].slice(
          this.tableau[location.pileIndex].length - count,
        );
      default:
        return [];
    }
  }

  private removeCardsFromLocation(location: CardLocation, count: number): void {
    switch (location.type) {
      case "stock":
        this.stock.splice(this.stock.length - count, count);
        break;
      case "waste":
        this.waste.splice(this.waste.length - count, count);
        break;
      case "foundation":
        this.foundations[location.index].splice(
          this.foundations[location.index].length - count,
          count,
        );
        break;
      case "tableau":
        this.tableau[location.pileIndex].splice(location.cardIndex, count);
        break;
    }
  }

  private addCardsToLocation(location: CardLocation, cards: Card[]): void {
    switch (location.type) {
      case "foundation":
        this.foundations[location.index].push(...cards);
        break;
      case "tableau":
        this.tableau[location.pileIndex].push(...cards);
        break;
      case "waste":
        this.waste.push(...cards);
        break;
      case "stock":
        this.stock.push(...cards);
        break;
    }
  }

  private getLocationName(location: CardLocation): string {
    switch (location.type) {
      case "stock":
        return "stock";
      case "waste":
        return "waste";
      case "foundation":
        return "foundation";
      case "tableau":
        return `tableau ${location.pileIndex + 1}`;
    }
  }

  private log(message: string): void {
    this.lastActionLog.unshift(message);
    if (this.lastActionLog.length > 8) {
      this.lastActionLog.pop();
    }
  }
}
