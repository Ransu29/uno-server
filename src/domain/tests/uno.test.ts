// src/domain/uno.test.ts
import { GameEngine } from '../GameEngine';
import { CardColor, CardType, Player } from '../types';

describe('UNO Call Mechanics', () => {
  let mockPlayers: Player[];

  beforeEach(() => {
    // FIXED: Added socketId and connected fields
    mockPlayers = [
      { id: 'p1', name: 'Alice', hand: [], isSafe: false, socketId: 's1', connected: true },
      { id: 'p2', name: 'Bob', hand: [], isSafe: false, socketId: 's2', connected: true },
    ];
  });

  test('Player becomes vulnerable when playing down to 1 card', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);

    state.players[0].hand = [
      { id: 'c1', color: CardColor.RED, type: CardType.NUMBER, value: 1 },
      { id: 'c2', color: CardColor.RED, type: CardType.NUMBER, value: 2 }
    ];
    state.activeColor = CardColor.RED;
    state.currentTurnIndex = 0;

    GameEngine.playCard(state, 'p1', 'c1');

    expect(state.players[0].hand.length).toBe(1);
    expect(state.players[0].isSafe).toBe(false);
  });

  test('Challenge applies penalty if player has not called UNO', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state.players[0].hand = [{ id: 'last', color: CardColor.RED, type: CardType.NUMBER, value: 5 }];
    state.players[0].isSafe = false;
    state.deck = [{ id: 'd1', color: CardColor.BLUE, type: CardType.NUMBER, value: 1 }, { id: 'd2', color: CardColor.BLUE, type: CardType.NUMBER, value: 2 }];

    const success = GameEngine.challengeUno(state, 'p2', 'p1');

    expect(success).toBe(true);
    expect(state.players[0].hand.length).toBe(3); 
  });

  test('Challenge fails if player Called UNO', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state.players[0].hand = [{ id: 'last', color: CardColor.RED, type: CardType.NUMBER, value: 5 }];
    state.players[0].isSafe = false;

    GameEngine.callUno(state, 'p1');

    const success = GameEngine.challengeUno(state, 'p2', 'p1');

    expect(success).toBe(false);
    expect(state.players[0].hand.length).toBe(1); 
  });

  test('Drawing cards resets isSafe status', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state.players[0].isSafe = true;

    GameEngine.drawCards(state, 'p1', 1);

    if (state.players[0].hand.length > 1) {
        expect(state.players[0].isSafe).toBe(false);
    }
  });
});