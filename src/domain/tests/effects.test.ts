// src/domain/effects.test.ts
import { GameEngine } from '../GameEngine';
import { CardType, CardColor, Player } from '../types';

describe('Advanced Card Effects', () => {
  let mockPlayers: Player[];

  beforeEach(() => {
    mockPlayers = [
      { id: 'p1', name: 'A', hand: [], isSafe: false, connected: true, socketId: 's1' },
      { id: 'p2', name: 'B', hand: [], isSafe: false, connected: true, socketId: 's2' },
      { id: 'p3', name: 'C', hand: [], isSafe: false, connected: true, socketId: 's3' },
    ];
  });

  test('Draw Two should give cards AND skip turn', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);
    
    // Force Deterministic State
    state.currentTurnIndex = 0; // P1
    state.direction = 1;
    
    // Setup P1 to play Draw 2
    state.players[0].hand = [{ id: 'd2', color: CardColor.BLUE, type: CardType.DRAW_TWO }];
    state.activeColor = CardColor.BLUE;
    
    // Snapshot P2 hand size
    const p2InitialHand = state.players[1].hand.length;

    GameEngine.playCard(state, 'p1', 'd2');

    // Effect 1: P2 gets 2 cards
    expect(state.players[1].hand.length).toBe(p2InitialHand + 2);

    // Effect 2: P2 is skipped. Turn should be P3 (index 2)
    expect(state.currentTurnIndex).toBe(2);
  });

  test('Wild Draw Four should give 4 cards AND skip turn', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);
    state.currentTurnIndex = 0; 
    
    // Setup P1 to play WD4
    state.players[0].hand = [{ id: 'wd4', color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR }];
    state.activeColor = CardColor.RED; // P1 matches via Wild, valid.

    const p2InitialHand = state.players[1].hand.length;

    // Play WD4, choosing YELLOW
    GameEngine.playCard(state, 'p1', 'wd4', CardColor.YELLOW);

    // Effect 1: Active color updates
    expect(state.activeColor).toBe(CardColor.YELLOW);

    // Effect 2: P2 gets 4 cards
    expect(state.players[1].hand.length).toBe(p2InitialHand + 4);

    // Effect 3: P2 is skipped. Turn is P3.
    expect(state.currentTurnIndex).toBe(2);
  });
});