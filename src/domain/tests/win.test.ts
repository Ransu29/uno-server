// src/domain/win.test.ts
import { GameEngine } from '../GameEngine';
import { CardColor, CardType, GameStatus, Player } from '../types';

describe('Win Condition Logic', () => {
  let mockPlayers: Player[];

  beforeEach(() => {
    // FIXED: Added socketId and connected fields
    mockPlayers = [
      { id: 'p1', name: 'Winner', hand: [], isSafe: false, socketId: 's1', connected: true },
      { id: 'p2', name: 'Loser', hand: [], isSafe: false, socketId: 's2', connected: true },
    ];
  });

  test('Game ends when player plays last card', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);

    const winningCard = { id: 'win-card', color: CardColor.RED, type: CardType.NUMBER, value: 9 };
    state.players[0].hand = [winningCard];
    state.activeColor = CardColor.RED;
    state.currentTurnIndex = 0;

    GameEngine.playCard(state, 'p1', 'win-card');

    expect(state.status).toBe(GameStatus.FINISHED);
    expect(state.winnerId).toBe('p1');
    expect(state.players[0].hand.length).toBe(0);
  });

  test('Action card effects apply before game ends', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state = GameEngine.startGame(state);

    const lastCard = { id: 'last-d2', color: CardColor.BLUE, type: CardType.DRAW_TWO };
    state.players[0].hand = [lastCard];
    
    state.players[1].hand = [{ id: 'p2-c1', color: CardColor.GREEN, type: CardType.NUMBER, value: 1 }];

    state.activeColor = CardColor.BLUE;
    state.currentTurnIndex = 0;

    GameEngine.playCard(state, 'p1', 'last-d2');

    expect(state.status).toBe(GameStatus.FINISHED);
    expect(state.winnerId).toBe('p1');
    expect(state.players[1].hand.length).toBe(3);
  });
  
  test('Cannot play cards after game is finished', () => {
    let state = GameEngine.createGame('room1', mockPlayers);
    state.status = GameStatus.FINISHED;
    state.winnerId = 'p1';
    
    const p2Card = { id: 'p2-c1', color: CardColor.GREEN, type: CardType.NUMBER, value: 1 };
    state.players[1].hand = [p2Card];

    expect(() => {
       GameEngine.playCard(state, 'p2', 'p2-c1');
    }).toThrow('Game not in progress');
  });
});