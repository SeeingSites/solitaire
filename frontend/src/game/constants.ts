import { Suit, Rank } from "./types";

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export const FOUNDATION_SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

export const RANK_VALUES: Record<Rank, number> = {
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

// Responsive card dimensions - read from CSS custom properties
export function getCardWidth(): number {
  if (typeof window === "undefined") return 80;
  const val = getComputedStyle(document.documentElement).getPropertyValue("--card-w").trim();
  return parseInt(val, 10) || 80;
}

export function getCardHeight(): number {
  if (typeof window === "undefined") return 112;
  const val = getComputedStyle(document.documentElement).getPropertyValue("--card-h").trim();
  return parseInt(val, 10) || 112;
}

export function getCardOverlap(): number {
  if (typeof window === "undefined") return 25;
  const val = getComputedStyle(document.documentElement).getPropertyValue("--card-overlap").trim();
  return parseInt(val, 10) || 25;
}
