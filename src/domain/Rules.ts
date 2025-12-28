// src/domain/Rules.ts
import { Card, CardColor, CardType, GameState, Player } from './types';

export class Rules {
  /**
   * Checks if a card can be played on the current state.
   */
  static canPlayCard(card: Card, state: GameState): boolean {
    // 1. Wilds can always be played
    if (card.color === CardColor.WILD) return true;

    // 2. Match Color (Active color might be different from discard pile if a Wild was played)
    if (card.color === state.activeColor) return true;

    // 3. Match Number (if applicable)
    if (
      card.type === CardType.NUMBER &&
      state.activeNumber !== null &&
      card.value === state.activeNumber
    ) {
      return true;
    }

    // 4. Match Symbol/Action
    if (
      card.type !== CardType.NUMBER &&
      state.activeType !== null &&
      card.type === state.activeType
    ) {
      return true;
    }

    return false;
  }

  /**
   * Used for Wild Draw 4 Challenges.
   * A WD4 is "illegal" if the player holds a card matching the CURRENT color.
   */
  static isWildDraw4Illegal(hand: Card[], currentActiveColor: CardColor): boolean {
    // If you have a card that matches the active color, you were bluffing.
    return hand.some((c) => c.color === currentActiveColor);
  }

  /**
   * Calculates the next player index.
   */
  static getNextPlayerIndex(currentIndex: number, direction: number, playerCount: number, steps: number = 1): number {
    let nextIndex = (currentIndex + (direction * steps)) % playerCount;
    if (nextIndex < 0) nextIndex += playerCount; // Handle negative modulo in JS
    return nextIndex;
  }
}