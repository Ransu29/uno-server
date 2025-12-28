// src/domain/types.ts
export enum CardColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  WILD = 'wild',
}

export enum CardType {
  NUMBER = 'number',
  SKIP = 'skip',
  REVERSE = 'reverse',
  DRAW_TWO = 'draw2',
  WILD = 'wild',
  WILD_DRAW_FOUR = 'wild_draw4',
  WILD_SHUFFLE_HANDS = 'wild_shuffle',
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

export interface Card {
  id: string; // UUID to ensure every card instance is unique
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for NUMBER cards
}

export interface Player {
  id: string;        // Persistent UUID (stored in client localStorage)
  socketId: string;  // Transient Socket.IO ID (changes on reconnect)
  name: string;
  hand: Card[];
  isSafe: boolean;
  connected: boolean; // New flag for connection status
}

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentTurnIndex: number;
  direction: 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise
  activeColor: CardColor; // The color currently in play (handles Wilds)
  activeNumber: number | null; // The number currently in play (handles number matches)
  activeType: CardType | null; // The symbol currently in play
  winnerId: string | null;
}