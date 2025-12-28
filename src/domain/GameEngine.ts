// src/domain/GameEngine.ts
import { DeckFactory } from './DeckFactory';
import { Card, CardColor, CardType, GameState, GameStatus, Player } from './types';
import {Rules} from './Rules'

export class GameEngine {
  
  public static createGame(roomId: string, players: Player[]): GameState {
    return {
      roomId,
      status: GameStatus.WAITING,
      players, // Expects players to already have basic info (id, name), hand is empty
      deck: [],
      discardPile: [],
      currentTurnIndex: 0,
      direction: 1,
      activeColor: CardColor.RED, // Placeholder, set during start
      activeNumber: null,
      activeType: null,
      winnerId: null,
    };
  }

   public static startGame(state: GameState): GameState {
    if (state.players.length < 2) throw new Error('Not enough players to start.');

    // 1. Create and Shuffle Deck
    state.deck = DeckFactory.shuffle(DeckFactory.createDeck());
    state.status = GameStatus.PLAYING;

    // 2. Deal 7 cards
    this.dealCards(state, 7);

    // 3. Flip top card
    let topCard = state.deck.pop();
    if (!topCard) throw new Error('Deck empty during init');

    // Rule: Cannot start with Wild Draw 4. Reshuffle until valid.
    while (topCard.type === CardType.WILD_DRAW_FOUR) {
      state.deck.push(topCard);
      state.deck = DeckFactory.shuffle(state.deck);
      topCard = state.deck.pop()!;
    }

    state.discardPile = [topCard];
    
    // 4. Set Initial Active State
    state.activeColor = topCard.color;
    state.activeType = topCard.type;
    state.activeNumber = topCard.value ?? null;
    state.currentTurnIndex = 0;
    state.direction = 1;

    // 5. Apply Starting Rules
    this.applyStartingCardRules(state, topCard);

    return state;
  }

  private static dealCards(state: GameState, count: number) {
    state.players.forEach(player => {
      player.hand = []; // Reset hand
      for (let i = 0; i < count; i++) {
        if (state.deck.length === 0) this.refillDeckFromDiscard(state);
        const card = state.deck.pop();
        if (card) player.hand.push(card);
      }
    });
  }

  
  private static applyStartingCardRules(state: GameState, card: Card) {
    // Default direction
    state.direction = 1;
    state.currentTurnIndex = 0;

    switch (card.type) {
      case CardType.WILD:
      case CardType.WILD_SHUFFLE_HANDS:
        // Rule: First player chooses color.
        // In this MVP, we cannot "ask" the player during init.
        // Standard rule variation: Dealer Left plays first and allows them to play ANY color.
        // Implementation: We set activeColor to WILD (or hold null) to indicate "Any".
        // However, to keep strict typing, we usually default to Red or random, 
        // OR we wait for the first player's input.
        // For Automation: We will let the first player play anything.
        state.activeColor = CardColor.WILD; 
        break;

      case CardType.SKIP:
        // Rule: Player to dealer's left is skipped.
        // Dealer is effectively "last player", so P0 is usually "Dealer's Left".
        // So P0 gets skipped, start at P1.
        state.currentTurnIndex = 1; 
        break;

      case CardType.REVERSE:
        // Rule: Dealer goes first, play moves right (Counter-Clockwise).
        state.direction = -1;
        // Dealer is last index. 
        state.currentTurnIndex = state.players.length - 1;
        break;

      case CardType.DRAW_TWO:
        // Rule: P0 draws 2 and gets skipped.
        const p0 = state.players[0];
        this.drawCards(state, p0.id, 2);
        state.currentTurnIndex = 1; // Skip P0
        break;
      
      default:
        // Number cards: P0 starts (index 0)
        state.currentTurnIndex = 0;
        break;
    }

    // Ensure index wrap-around safety
    if (state.currentTurnIndex >= state.players.length) state.currentTurnIndex = 0;
    if (state.currentTurnIndex < 0) state.currentTurnIndex = state.players.length - 1;
  }

 // 1. The Main Action: Play a Card
  public static playCard(
    state: GameState, 
    playerId: string, 
    cardId: string, 
    selectedWildColor?: CardColor
  ): GameState {
    if (state.status !== GameStatus.PLAYING) throw new Error('Game not in progress');

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
  
    if (playerIndex !== state.currentTurnIndex) throw new Error('Not your turn');

    const player = state.players[playerIndex];
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) throw new Error('Card not in hand');

    const card = player.hand[cardIndex];

    // Validate Move
    if (!Rules.canPlayCard(card, state)) {
      throw new Error('Illegal move: Card does not match state');
    }

    // Handle Wild Color Selection
    if (card.color === CardColor.WILD) {
      if (!selectedWildColor || selectedWildColor === CardColor.WILD) {
        throw new Error('Must select a color for Wild cards');
      }
    }

   

    // --- EXECUTE MOVE ---
    
    // 1. Remove card from hand
    player.hand.splice(cardIndex, 1);
    
    // 2. Add to discard pile
    state.discardPile.push(card);

    
    

    // 3. Update Active State
    state.activeType = card.type;
    state.activeNumber = card.value ?? null;
    state.activeColor = (card.color === CardColor.WILD) 
      ? selectedWildColor! // User choice
      : card.color;        // Card color

    // 4. Handle Special Effects
    this.applyCardEffect(state, card, playerIndex);

    
    if (player.hand.length === 1) {
      player.isSafe = false; 
    }  
    // 5. Check Win Condition
    else if (player.hand.length === 0) {
      state.status = GameStatus.FINISHED;
      state.winnerId = player.id;
    }

    return state;
  }

  private static applyCardEffect(state: GameState, card: Card, currentPlayerIndex: number) {
    const playerCount = state.players.length;

    switch (card.type) {
      case CardType.SKIP:
        // Skip next player: Advance 2 steps
        state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 2);
        break;

      case CardType.REVERSE:
        if (playerCount === 2) {
            state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 2);
        } else {
            // Explicit toggle instead of `* -1` to satisfy strict literal types
            state.direction = state.direction === 1 ? -1 : 1;
            state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 1);
        }
        break;

      case CardType.DRAW_TWO:
        // Next player draws 2 AND loses turn
        const nextPlayerIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 1);
        this.drawCards(state, state.players[nextPlayerIndex].id, 2);
        // Skip them
        state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 2);
        break;

      case CardType.WILD_DRAW_FOUR:
        // NOTE: In a full UI, we would wait for a challenge. 
        // For this logic step, we apply the draw immediately. 
        // A "Challenge" endpoint would reverse this if valid.
        const victimIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 1);
        this.drawCards(state, state.players[victimIndex].id, 4);
        state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 2);
        break;

      case CardType.WILD_SHUFFLE_HANDS:
        this.executeWildShuffleHands(state, currentPlayerIndex);
        // Turn moves to next player usually
        state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 1);
        break;

      default:
        // Number or standard Wild: Advance 1
        state.currentTurnIndex = Rules.getNextPlayerIndex(state.currentTurnIndex, state.direction, playerCount, 1);
        break;
    }
  }

  // Logic for Wild Shuffle Hands
  private static executeWildShuffleHands(state: GameState, dealerIndex: number) {
    // 1. Collect all cards
    let allCards: Card[] = [];
    state.players.forEach(p => {
      allCards.push(...p.hand);
      p.hand = [];
    });

    // 2. Shuffle
    allCards = DeckFactory.shuffle(allCards);

    // 3. Deal back starting to the left of the player who played it
    let targetIndex = Rules.getNextPlayerIndex(dealerIndex, state.direction, state.players.length, 1);
    
    while (allCards.length > 0) {
      const card = allCards.pop();
      if (card) {
        state.players[targetIndex].hand.push(card);
        targetIndex = Rules.getNextPlayerIndex(targetIndex, state.direction, state.players.length, 1);
      }
    }
  }

  
  
   // UPDATE: drawCards needs to reset safety if hand grows
  public static drawCards(state: GameState, playerId: string, count: number) {
     const player = state.players.find(p => p.id === playerId);
     if (!player) return;
     
     for (let i = 0; i != count; i++) {
       if (state.deck.length === 0) this.refillDeckFromDiscard(state);
       const card = state.deck.pop();
       if (card) player.hand.push(card);
     }

     // Rule: If you have more than 1 card, the "UNO" status is reset/irrelevant.
     if (player.hand.length > 1) {
       player.isSafe = false;
     }
  }
  
  public static refillDeckFromDiscard(state: GameState) {
    if (state.discardPile.length <= 1) return;
    const topCard = state.discardPile.pop()!;
    const newDeck = [...state.discardPile];
    state.discardPile = [topCard];
    state.deck = DeckFactory.shuffle(newDeck);
  }

  // NEW METHOD: Handle a player shouting "UNO"
  public static callUno(state: GameState, playerId: string) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // You can technically call UNO anytime, but it only matters if you have 1 or 2 cards
    // (2 cards means you are about to play one and go to 1)
    player.isSafe = true;
  }


  // NEW METHOD: Handle an accusation
  public static challengeUno(state: GameState, challengerId: string, victimId: string) {
    const victim = state.players.find((p) => p.id === victimId);
    if (!victim) throw new Error('Victim not found');

    // Rule: "If caught not saying Uno... must draw two cards"
    // Condition: Victim has 1 card AND has not called Uno (isSafe is false)
    if (victim.hand.length === 1 && !victim.isSafe) {
      // Penalty!
      this.drawCards(state, victimId, 2);
      
      // Reset safe status (irrelevant since they now have 3 cards, but good cleanup)
      victim.isSafe = false;
      return true; // Challenge successful
    }
    
    return false; // Challenge failed (Victim was safe or didn't have 1 card)
  }

   public static handleDisconnect(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    player.connected = false;

    // IF it was their turn, advance to next player to prevent stalling
    if (state.status === GameStatus.PLAYING && 
        state.players[state.currentTurnIndex].id === playerId) {
      this.advanceTurnToNextConnected(state);
    }

    return state;}

    public static handleReconnect(state: GameState, playerId: string, newSocketId: string): Player {
    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found in game');

    player.socketId = newSocketId;
    player.connected = true;
    
    return player;
  }

  // Helper to skip disconnected players
  private static advanceTurnToNextConnected(state: GameState) {
    const playerCount = state.players.length;
    let attempts = 0;
    
    do {
      // Advance one step
      state.currentTurnIndex = Rules.getNextPlayerIndex(
        state.currentTurnIndex, 
        state.direction, 
        playerCount, 
        1
      );
      attempts++;
    } while (
      !state.players[state.currentTurnIndex].connected && 
      attempts < playerCount // Prevent infinite loop if everyone disconnects
    );
  }

}