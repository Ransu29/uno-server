// simulate.ts
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

// 1. Simulate Player 1 (The Host)
const hostSocket = io(SERVER_URL);
let roomId = '';

hostSocket.on('connect', () => {
  console.log('🤖 Host connected');
  
  // Create Room
  hostSocket.emit('create_room', { playerName: 'HostBot' }, (response: any) => {
    roomId = response.roomId;
    console.log(`🤖 Room Created: ${roomId}`);
    
    // Once room is created, bring in Player 2
    connectPlayer2();
  });
});

hostSocket.on('game_started', (game) => {
  console.log('✅ Game Started! The server log should show a JSON entry now.');
  process.exit(0); // Exit script on success
});

// 2. Simulate Player 2
function connectPlayer2() {
  const p2Socket = io(SERVER_URL);
  
  p2Socket.on('connect', () => {
    console.log('🤖 Player 2 connected');
    
    // Join the room Host just created
    p2Socket.emit('join_room', { 
      roomId: roomId, 
      playerName: 'JoinerBot' 
    });
  });

  p2Socket.on('joined_success', () => {
    console.log('🤖 Player 2 Joined successfully');
    
    // Now Host starts the game
    setTimeout(() => {
      hostSocket.emit('start_game');
    }, 1000);
  });
}