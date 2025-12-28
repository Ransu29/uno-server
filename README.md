# UNO Game Server 🎮

A real-time, server-authoritative UNO game engine built with Node.js, TypeScript, and Socket.IO.

## 🚀 Features
- **Server-Authoritative:** All rules validated on backend.
- **Industry Standard:** Clean Architecture (Domain, Application, Infra).
- **Type-Safe:** Built with strict TypeScript.
- **Observability:** Structured JSON logging.
- **Resilient:** Handles disconnects and reconnections via UUIDs.

## 🛠️ Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Locally**
   ```bash
   npm run dev
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

## 🐳 Docker Deployment

1. **Build Image**
   ```bash
   docker build -t uno-server .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 -d --name uno-instance uno-server
   ```

## 🔌 API / Events

### Connection
All events are handled via **Socket.IO**.
URL: `ws://localhost:3000`

### Client -> Server Events
| Event | Payload | Description |
| :--- | :--- | :--- |
| `create_room` | `{ playerName: string }` | Creates a new game room. |
| `join_room` | `{ roomId: string, playerName: string, playerId?: string }` | Joins a room. Send `playerId` to reconnect. |
| `start_game` | `{}` | Host starts the game. |
| `play_card` | `{ cardId: string, selectedColor?: string }` | Play a card from hand. |
| `draw_card` | `{}` | Draw a card from deck. |
| `call_uno` | `{}` | Shout UNO. |
| `challenge` | `{ targetPlayerId: string }` | Challenge a player for not calling UNO. |

### Server -> Client Events
| Event | Payload | Description |
| :--- | :--- | :--- |
| `player_joined` | `{ players: Player[] }` | Update of lobby members. |
| `game_started` | `GameState` | Game has begun. |
| `state_update` | `GameState` | The board has changed (card played, turn change). |
| `game_over` | `{ winnerId: string }` | Game ended. |
| `error` | `{ message: string }` | Action rejected. |

## 🏗️ Architecture

The project follows **Domain-Driven Design (DDD)** principles:

- **src/domain**: Pure business logic (Rules, Deck, GameEngine). No external dependencies.
- **src/application**: Controllers (SocketHandler) and validation (Zod).
- **src/infrastructure**: Persistence (MemoryStore) and Logging.

```

### 6. Verification
To verify the deployment build works:

1.  Run the build command in your terminal:
    ```bash
    docker build -t uno-server .
    ```
2.  Run the container:
    ```bash
    docker run -p 3000:3000 uno-server
    ```
3.  Visit `http://localhost:3000/health`. You should see `{"status":"ok"}`.

