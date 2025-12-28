// src/domain/rules.test.ts
import { GameEngine } from '../GameEngine';
import { CardColor, CardType, Player } from '../types';

describe('Game Rules & Turn Logic', () => {
  let mockPlayers: Player[];

  beforeEach(() => {
    // FIXED: Added socketId and connected fields
    mockPlayers = [
      { id: 'p1', name: 'A', hand: [], isSafe: false, socketId: 's1', connected: true },
      { id: 'p2', name: 'B', hand: [], isSafe: false, socketId: 's2', connected: true },
      { id: 'p3', name: 'C', hand: [], isSafe: false, socketId: 's3', connected: true },
    ];
  });

  test('Skip card should jump over next player', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);
    
    const skipCard = { id: 'test-skip', color: CardColor.BLUE, type: CardType.SKIP };
    state.players[0].hand = [skipCard];
    
    state.activeColor = CardColor.BLUE;
    state.currentTurnIndex = 0; 

    GameEngine.playCard(state, 'p1', 'test-skip');
    expect(state.currentTurnIndex).toBe(2);
  });

  test('Reverse card should flip direction', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state); 

    state.direction = 1; 
    state.currentTurnIndex = 0; 

    const reverseCard = { id: 'test-rev', color: CardColor.BLUE, type: CardType.REVERSE };
    state.players[0].hand = [reverseCard];
    state.activeColor = CardColor.BLUE;

    GameEngine.playCard(state, 'p1', 'test-rev');

    expect(state.direction).toBe(-1);
    expect(state.currentTurnIndex).toBe(2);
  });

  test('Wild Shuffle Hands should redistribute cards', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);

    const shuffleCard = { id: 'test-shuff', color: CardColor.WILD, type: CardType.WILD_SHUFFLE_HANDS };
    state.players[0].hand = [shuffleCard];
    
    state.players[1].hand = Array(5).fill({ id: 'x', color: CardColor.RED, type: CardType.NUMBER, value: 1 });
    state.players[2].hand = Array(2).fill({ id: 'y', color: CardColor.RED, type: CardType.NUMBER, value: 1 });

    state.currentTurnIndex = 0;

    GameEngine.playCard(state, 'p1', 'test-shuff', CardColor.RED);

    const totalHandCards = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalHandCards).toBe(7); 
    
    expect(state.players[1].hand.length).toBeGreaterThanOrEqual(2);
    expect(state.players[2].hand.length).toBeGreaterThanOrEqual(2);
  });
});