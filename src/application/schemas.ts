import { z } from 'zod';
import { CardColor } from '../domain/types';

export const JoinRoomSchema = z.object({
  roomId: z.string().min(1),
  playerName: z.string().min(1).max(20),
  playerId: z.string().uuid().optional(), // NEW: Optional for reconnection
});
// Schema for playing a card
export const PlayCardSchema = z.object({
  cardId: z.string().uuid(),
  selectedColor: z.nativeEnum(CardColor).optional(), // Only needed for Wilds
});

// Schema for Uno Call/Challenge
export const TargetPlayerSchema = z.object({
  targetPlayerId: z.string().uuid().optional(), // Optional depending on context
});

