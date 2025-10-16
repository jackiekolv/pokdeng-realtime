# Pokdeng Real-time Game 🃏

A modern, secure real-time Pokdeng (Thai card game) implementation using Node.js, Express.js, and Socket.IO.

## Features ✨

- **Real-time multiplayer gameplay** with Socket.IO
- **Global game room** - All players join the same session
- **Shared deck system** - Everyone uses the same deck of cards
- **Name validation** - Must enter name before playing
- **Host system** - One host per room with approval-based transfers
- **Button state management** - POK/HIT buttons disable after use
- **Global shuffle** - Host can reset all players' cards at once
- **Cookie persistence** - Remembers username and host status
- **Modern ES6+ JavaScript** with improved code structure
- **Security features** including rate limiting and input validation
- **Automatic deck shuffling** and card dealing
- **Pokdeng game logic** with special hand detection
- **Card value display** - Shows hand value on cards instead of chat
- **Real-time chat** - Players can communicate during the game
- **Responsive design** with modern UI

## Game Rules 🎮

Pokdeng is a popular Thai card game similar to Baccarat:

1. **Objective**: Get a hand value as close to 9 as possible
2. **Card Values**:
   - Ace = 1
   - 2-9 = Face value
   - 10, J, Q, K = 10 (but count as 0 in final calculation)
3. **Hand Value**: Sum of cards modulo 10
4. **Special Hands**:
   - **Pokdeng**: 8 or 9 with 2 cards (2x multiplier)
   - **Same Suit**: Both cards same suit (2x multiplier)
   - **Pair**: Both cards same value (2x multiplier)
   - **Straight**: Consecutive values (2x multiplier)

## How to Play 🎯

1. **Enter Your Name**: Fill in your name in the textbox (required to play)
2. **Join the Game**: After entering name, you automatically join the global room
3. **Shared Deck**: Everyone uses the same deck of cards
4. **Become Host**: Click "I am a Host!" to request host privileges
   - First player becomes host automatically
   - Only one host per room
   - Current host must approve new host requests
   - Host can shuffle cards
5. **Deal Cards**: Click "POK" to get 2 cards from the shared deck
   - Button becomes disabled after use until next shuffle
6. **Hit**: Click "HIT" to get a 3rd card (optional)
   - Must click POK first
   - Button becomes disabled after use until next shuffle
7. **Shuffle**: Host can click "SHUFFLE" to:
   - Reshuffle the entire deck
   - Reset all players' cards (everyone's cards are flipped face-down)
   - Re-enable POK and HIT buttons for everyone
   - Start fresh for everyone
8. **Chat**: Use the chat to communicate with other players

## Installation 🚀

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jackiekolv/pokdeng-realtime.git
   cd pokdeng-realtime
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   # Production
   npm start

   # Development (with auto-restart)
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5000`

## Monitoring 📊

Monitor server health and performance:

```bash
# Monitor server health
npm run monitor

# Monitor with custom port
node scripts/monitor.js 3000
```

The monitoring script will:
- ✅ Test HTTP endpoint availability
- ✅ Test Socket.IO connectivity and latency
- 🧪 Test connection limits and rate limiting
- 📊 Display real-time server health status

## Live Demo 🌐

Try the game online: https://serene-castle-11434.herokuapp.com/

## Project Structure 📁

```
pokdeng-realtime/
├── app.js                 # Main server file
├── deck.js                # Card deck utilities
├── gameManager.js         # Game session management
├── config/
│   └── server.js          # Server configuration
├── middleware/
│   └── security.js        # Security middleware
├── utils/
│   └── logger.js          # Logging utility
├── views/                 # Pug templates
├── public/                # Static files (CSS, JS, images)
├── .env.example           # Environment variables template
└── package.json           # Dependencies and scripts
```

## Environment Variables 🌍

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Server Configuration
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `MAX_CONNECTIONS`: Maximum concurrent connections (default: 100)

### Logging Configuration
- `LOG_LEVEL`: Log level - error, warn, info, debug (default: info)
- `CONNECTION_LOG_INTERVAL`: Log every Nth connection (default: 10)
- `STATS_INTERVAL`: Server stats interval in ms (default: 300000 = 5 minutes)
- `ENABLE_CONNECTION_LOGS`: Enable connection logs (default: true)
- `ENABLE_COMMAND_LOGS`: Enable game command logs (default: false)
- `ENABLE_CHAT_LOGS`: Enable chat message logs (default: false)
- `ENABLE_ERROR_LOGS`: Enable error logs (default: true)

### Security Configuration
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in ms (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)
- `SOCKET_RATE_LIMIT_MAX`: Max socket events per minute (default: 30)
- `MAX_CONNECTIONS_PER_IP`: Max connections per IP address (default: 5)

### Game Configuration
- `SESSION_CLEANUP_INTERVAL`: Session cleanup interval in ms (default: 1800000 = 30 minutes)
- `SESSION_EXPIRY_TIME`: Session expiry time in ms (default: 3600000 = 1 hour)
- `MAX_CARDS_PER_PLAYER`: Maximum cards per player (default: 3)
- `AUTO_SHUFFLE`: Auto shuffle when deck is low (default: true)
- `SHUFFLE_THRESHOLD`: Minimum cards before auto shuffle (default: 10)
