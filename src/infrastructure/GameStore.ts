import { GameState } from '../domain/types';

export class GameStore {
  // A simple Map to hold games in memory
  public static games: Map<string, GameState> = new Map();

  static get(roomId: string): GameState | undefined {
    return this.games.get(roomId);
  }

  static save(state: GameState): void {
    this.games.set(state.roomId, state);
  }

  static delete(roomId: string): void {
    this.games.delete(roomId);
  }
}

export { GameState };
