import { Card, Suit, Rank } from "./types";
import { SUITS, RANKS } from "./constants";

let cardIdCounter = 0;

export function createCard(suit: Suit, rank: Rank, faceUp: boolean = false): Card {
  return {
    id: `${suit}-${rank}-${++cardIdCounter}`,
    suit,
    rank,
    faceUp,
  };
}

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(suit, rank));
    }
  }
  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function isBlack(suit: Suit): boolean {
  return suit === "clubs" || suit === "spades";
}

export function canStackOnTableau(card: Card, target: Card): boolean {
  const cardValue = getRankValue(card.rank);
  const targetValue = getRankValue(target.rank);

  const differentColor =
    (isRed(card.suit) && isBlack(target.suit)) || (isBlack(card.suit) && isRed(target.suit));

  return differentColor && cardValue === targetValue - 1;
}

export function canStackOnFoundation(card: Card, foundation: Card[], expectedSuit: Suit): boolean {
  if (foundation.length === 0) {
    return card.rank === "A" && card.suit === expectedSuit;
  }

  const topCard = foundation[foundation.length - 1];
  const cardValue = getRankValue(card.rank);
  const topValue = getRankValue(topCard.rank);

  return card.suit === topCard.suit && cardValue === topValue + 1;
}

export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
  };
  return values[rank];
}
