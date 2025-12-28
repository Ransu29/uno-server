// src/domain/game.test.ts
import { GameEngine } from '../GameEngine';
import { Player } from '../types';

describe('GameEngine Core', () => {
  // FIXED: Added socketId and connected fields
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'Alice', hand: [], isSafe: false, socketId: 's1', connected: true },
    { id: 'p2', name: 'Bob', hand: [], isSafe: false, socketId: 's2', connected: true },
    { id: 'p3', name: 'Charlie', hand: [], isSafe: false, socketId: 's3', connected: true },
  ];

  test('should initialize game with 7 cards per player', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);

    expect(state.deck.length).toBeGreaterThan(0);
    expect(state.discardPile.length).toBe(1);
    
    state.players.forEach(player => {
      expect(player.hand.length).toBe(7);
    });
  });

  test('should regenerate draw pile when empty', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);

    const cardsToDiscard = state.deck.splice(0, 10);
    state.discardPile.push(...cardsToDiscard);
    state.deck = [];

    const totalCardsBeforeRegen = state.discardPile.length;
    
    GameEngine.refillDeckFromDiscard(state);

    expect(state.deck.length).toBe(totalCardsBeforeRegen - 1);
    expect(state.discardPile.length).toBe(1);
  });
});