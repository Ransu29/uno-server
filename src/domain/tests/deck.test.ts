// src/domain/deck.test.ts
import { DeckFactory } from '../DeckFactory';
import { CardType, CardColor } from '../types';

describe('DeckFactory', () => {
  const deck = DeckFactory.createDeck();

  test('should create exactly 109 cards (Standard 108 + 1 Wild Shuffle)', () => {
    // Standard UNO: 108 cards. SRS adds 1 Wild Shuffle. Total 109.
    expect(deck.length).toBe(109);
  });

  test('should have correct distribution of colors', () => {
    // 25 cards per color (1 zero, 2 of 1-9, 2 of each action)
    const redCards = deck.filter(c => c.color === CardColor.RED);
    const blueCards = deck.filter(c => c.color === CardColor.BLUE);
    
    expect(redCards.length).toBe(25);
    expect(blueCards.length).toBe(25);
  });

  test('should have correct Wild counts', () => {
    const wild = deck.filter(c => c.type === CardType.WILD);
    const wd4 = deck.filter(c => c.type === CardType.WILD_DRAW_FOUR);
    const shuffle = deck.filter(c => c.type === CardType.WILD_SHUFFLE_HANDS);

    expect(wild.length).toBe(4);
    expect(wd4.length).toBe(4);
    expect(shuffle.length).toBe(1);
  });

  test('should have unique IDs for every card', () => {
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(109);
  });
});