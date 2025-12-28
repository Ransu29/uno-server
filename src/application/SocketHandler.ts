import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine } from '../domain/GameEngine';
import { GameStore } from '../infrastructure/GameStore';
import { GameState, GameStatus } from '../domain/types';
import { JoinRoomSchema, PlayCardSchema, TargetPlayerSchema } from './schemas';
import { Logger } from '../infrastructure/Logger';

/**
 * SECURITY HELPER
 * Strips sensitive data (opponents' hands, draw pile) before sending state to client.
 */
const sanitizeGameStateForPlayer = (state: GameState, playerId: string): Partial<GameState> => {
  return {
    ...state,
    deck: [], // Hide draw pile
    players: state.players.map((p) => {
      // Calculate count explicitly
      const count = p.hand ? p.hand.length : 0; 
      
      return {
        ...p,
        // If it's me, give me my hand. If it's opponent, give empty array.
        hand: p.id === playerId ? p.hand : [],
        // ALWAYS send the count
        cardCount: count, 
      };
    }),
  };
};

export class SocketHandler {
  // Maps socketId -> { roomId, playerId } for O(1) lookup
  private socketMap = new Map<string, { roomId: string; playerId: string }>();
   // NEW: Track last action time to prevent double-firing
  private lastActionMap = new Map<string, number>();
  constructor(private io: Server) {
    this.setupRoutes();
  }

  private setupRoutes() {
    this.io.on('connection', (socket) => {
      Logger.info('New Connection', 'SocketHandler', { socketId: socket.id });

      // ==========================================
      // LOBBY MANAGEMENT
      // ==========================================

      socket.on('create_room', (data, callback) => {
        try {
          // Normalization: Force Uppercase for Room IDs
          const roomId = uuidv4().slice(0, 6).toUpperCase();
          const playerId = uuidv4();
          const playerName = data.playerName || 'Host';

          const player = {
            id: playerId,
            socketId: socket.id,
            name: playerName,
            hand: [],
            isSafe: false,
            connected: true,
          };

          const gameState = GameEngine.createGame(roomId, [player]);
          GameStore.save(gameState);

          this.socketMap.set(socket.id, { roomId, playerId });
          socket.join(roomId);

          Logger.info('Room Created', 'SocketHandler', { roomId, playerId });

          // Send initial state to creator
          socket.emit('sync_state', sanitizeGameStateForPlayer(gameState, playerId));
          
          if (callback) callback({ roomId, playerId });
        } catch (e: any) {
          this.sendError(socket, e, 'create_room');
        }
      });

      socket.on('join_room', (payload) => {
        try {
          const { roomId, playerName, playerId } = JoinRoomSchema.parse(payload);
          const normalizedRoomId = roomId.toUpperCase();
          
          const game = GameStore.get(normalizedRoomId);
          if (!game) throw new Error('Room not found');

          const existingPlayer = playerId ? game.players.find((p) => p.id === playerId) : undefined;

          if (existingPlayer) {
            // --- RECONNECTION ---
            GameEngine.handleReconnect(game, playerId!, socket.id);
            this.socketMap.set(socket.id, { roomId: normalizedRoomId, playerId: playerId! });
            
            socket.join(normalizedRoomId);
            
            // Sync state immediately to the reconnecting user
            socket.emit('sync_state', sanitizeGameStateForPlayer(game, playerId!));
            
            this.io.to(normalizedRoomId).emit('notification', { message: `${existingPlayer.name} reconnected` });
            Logger.info('Player Reconnected', 'SocketHandler', { roomId: normalizedRoomId, playerId });

          } else {
            // --- NEW JOIN ---
            if (game.status !== GameStatus.WAITING) throw new Error('Game already in progress');
            if (game.players.length >= 10) throw new Error('Room is full');

            const newPlayerId = uuidv4();
            const newPlayer = {
              id: newPlayerId,
              socketId: socket.id,
              name: playerName,
              hand: [],
              isSafe: false,
              connected: true,
            };

            game.players.push(newPlayer);
            this.socketMap.set(socket.id, { roomId: normalizedRoomId, playerId: newPlayerId });

            socket.join(normalizedRoomId);

            // 1. Send state to the NEW joiner
            socket.emit('sync_state', sanitizeGameStateForPlayer(game, newPlayerId));
            socket.emit('joined_success', { playerId: newPlayerId });

            // 2. Broadcast updated state to EVERYONE ELSE in the room
            // (This replaces the old 'player_joined' emit)
            for (const p of game.players) {
              // We already sent to newPlayerId above, so skip them to save bandwidth (optional optimization)
              if (p.id !== newPlayerId && p.connected && p.socketId) {
                this.io.to(p.socketId).emit('sync_state', sanitizeGameStateForPlayer(game, p.id));
              }
            }

            Logger.info('Player Joined', 'SocketHandler', { roomId: normalizedRoomId, playerId: newPlayerId });
          }
          GameStore.save(game);
        } catch (e: any) {
          this.sendError(socket, e, 'join_room');
        }
      });

      // ==========================================
      // GAMEPLAY
      // ==========================================

      socket.on('start_game', () => {
        try {
          const session = this.getSession(socket);
          const game = GameStore.get(session.roomId);
          if (!game) throw new Error('Game not found');

          if (game.players[0]?.id !== session.playerId) throw new Error('Only the host can start');
          if (game.players.length < 2) throw new Error('Not enough players');

          // CRITICAL: The GameEngine returns a NEW state object. Use THIS one.
          const startedGame = GameEngine.startGame(game);
          GameStore.save(startedGame); // Save the new state

          // Use the 'startedGame' object, which is the single source of truth
          this.broadcastState(startedGame, 'game_started');
        } catch (e: any) { this.sendError(socket, e, 'start_game'); }
      });

      socket.on('play_card', (payload) => {
          try {
            const session = this.getSession(socket);
            const game = GameStore.get(session.roomId);
            if (!game) throw new Error('Game not found');

            const { cardId, selectedColor } = PlayCardSchema.parse(payload);
            
            // 1. Mutate State
            const newState = GameEngine.playCard(game, session.playerId, cardId, selectedColor);
            GameStore.save(newState);

            // 2. Broadcast the NEW state (which might have status='finished')
            this.broadcastState(newState, 'state_update'); // <--- Critical: Send updated status

            // 3. Optional: Explicit Game Over event (if you want specific logic)
            if (newState.status === GameStatus.FINISHED) {
              this.io.to(session.roomId).emit('game_over', { winnerId: newState.winnerId });
            }
          } catch (e: any) { this.sendError(socket, e, 'play_card'); }
        });


       socket.on('draw_card', () => {
        try {
          const session = this.getSession(socket);
          
          // --- FIX: SERVER-SIDE DEBOUNCE ---
          const now = Date.now();
          const lastTime = this.lastActionMap.get(session.playerId) || 0;
          if (now - lastTime < 500) {
            console.log(`[Debounce] Ignoring rapid draw from ${session.playerId}`);
            return; 
          }
          this.lastActionMap.set(session.playerId, now);
          // ---------------------------------

          const game = GameStore.get(session.roomId);
          if (!game) throw new Error('Game not found');

          GameEngine.drawCards(game, session.playerId, 1);
          GameStore.save(game);

          this.broadcastState(game, 'state_update');
        } catch (e: any) { this.sendError(socket, e, 'draw_card'); }
      });

      socket.on('call_uno', () => {
        try {
          const session = this.getSession(socket);
          const game = GameStore.get(session.roomId);
          if (!game) throw new Error('Game not found');

          GameEngine.callUno(game, session.playerId);
          GameStore.save(game);

          // For pure visual events (like shouting UNO), we can broadcast simply
          this.io.to(session.roomId).emit('uno_called', { playerId: session.playerId });
          
          // But we also update state because isSafe flag changed
          this.broadcastState(game, 'state_update');
        } catch (e: any) {
          this.sendError(socket, e, 'call_uno');
        }
      });

      socket.on('challenge', (payload) => {
        try {
            const session = this.getSession(socket);
            const game = GameStore.get(session.roomId);
            if (!game) throw new Error('Game not found');
  
            const { targetPlayerId } = TargetPlayerSchema.parse(payload);
            const success = GameEngine.challengeUno(game, session.playerId, targetPlayerId!);
            GameStore.save(game);
  
            this.io.to(session.roomId).emit('challenge_result', {
              challenger: session.playerId,
              victim: targetPlayerId,
              success,
            });
            
            // Hand counts changed, so update state
            this.broadcastState(game, 'state_update');
        } catch(e: any) {
            this.sendError(socket, e, 'challenge');
        }
      });

      // ==========================================
      // DISCONNECT
      // ==========================================

      socket.on('disconnect', () => {
        const session = this.socketMap.get(socket.id);
        if (session) {
          const { roomId, playerId } = session;
          const game = GameStore.get(roomId);

          if (game) {
            GameEngine.handleDisconnect(game, playerId);
            GameStore.save(game);

            this.io.to(roomId).emit('player_disconnected', { playerId });
            
            // If the game is running, the turn might have auto-advanced
            if (game.status === GameStatus.PLAYING) {
              this.broadcastState(game, 'state_update');
            }
          }
          this.socketMap.delete(socket.id);
        }
      });
    });
  }

  /**
   * Helper to broadcast sanitized state to all connected players in a room.
   * This guarantees that every player receives their own view of the game.
   */
  // broadcastState helper remains the same, it is correct.
  private broadcastState(game: GameState, eventName: string) {
    for (const player of game.players) {
      if (player.connected && player.socketId) {
        const sanitized = sanitizeGameStateForPlayer(game, player.id);
        this.io.to(player.socketId).emit(eventName, sanitized);
      }
    }
  }

  private getSession(socket: Socket) {
    const session = this.socketMap.get(socket.id);
    if (!session) throw new Error('You are not in a game room');
    return session;
  }

  private sendError(socket: Socket, error: Error, event: string) {
    Logger.error(`Error handling ${event}`, 'SocketHandler', { message: error.message });
    socket.emit('error', { message: error.message, event });
  }
}