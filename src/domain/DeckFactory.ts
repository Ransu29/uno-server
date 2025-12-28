// src/domain/DeckFactory.ts
import { randomUUID } from 'crypto'; // <--- Native Node.js module (No install needed)
import { Card, CardColor, CardType } from './types';

export class DeckFactory {
  // Fisher-Yates Shuffle Algorithm
  static shuffle(cards: Card[]): Card[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static createDeck(): Card[] {
    const deck: Card[] = [];
    const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];

    colors.forEach((color) => {
      // 1 Zero per color
      deck.push({ id: randomUUID(), color, type: CardType.NUMBER, value: 0 });

      // 2 of each number 1-9
      for (let i = 1; i <= 9; i++) {
        deck.push({ id: randomUUID(), color, type: CardType.NUMBER, value: i });
        deck.push({ id: randomUUID(), color, type: CardType.NUMBER, value: i });
      }

      // 2 of each Action Card
      [CardType.SKIP, CardType.REVERSE, CardType.DRAW_TWO].forEach((type) => {
        deck.push({ id: randomUUID(), color, type });
        deck.push({ id: randomUUID(), color, type });
      });
    });

    // 4 Wilds, 4 Wild Draw Fours
    for (let i = 0; i < 4; i++) {
      deck.push({ id: randomUUID(), color: CardColor.WILD, type: CardType.WILD });
      deck.push({ id: randomUUID(), color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR });
    }

    // 1 Wild Shuffle Hands
    deck.push({ id: randomUUID(), color: CardColor.WILD, type: CardType.WILD_SHUFFLE_HANDS });

    return deck;
  }
}