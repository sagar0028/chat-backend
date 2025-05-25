# Real-time Chat Application Backend

A robust backend service for a real-time chat application built with Node.js, Express, WebSocket, PostgreSQL, and Redis.

```
web_socket/
├── backend/           # Node.js WebSocket server
│   ├── src/
│   │   ├── config/   # Configuration files
│   │   ├── models/   # Data models
│   │   ├── utils/    # Utility functions
│   │   └── events/   # Event handlers
│   └── uploads/      # File uploads directory
│
│
└── README.md        # Project documentation
```

## Features

- Real-time messaging using WebSocket
- User authentication and authorization
- Message persistence in PostgreSQL
- Message read status tracking
- Online/Offline user status
- Real-time typing indicators
- File sharing support
- User profile management
- Redis for caching and real-time features

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **WebSocket** - Real-time communication
- **PostgreSQL** - Primary database
- **Redis** - Caching and real-time features
- **Knex.js** - SQL query builder and migrations
- **JWT** - Authentication

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Redis
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/sagar0028/chat-backend-.git
cd chat-backend-
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp src/config/config.example.js .env
```

Edit the `.env` file with your configuration.

4. Run database migrations:

```bash
npx knex migrate:latest
```

5. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/status` - Get user online status

### Messages

- `GET /api/messages/:userId` - Get chat history with a user
- `POST /api/messages` - Send a message
- `PUT /api/messages/:id/read` - Mark message as read
- `POST /api/messages/file` - Upload file message

## WebSocket Events

### Client -> Server

- `message` - Send a new message
- `typing` - User typing indicator
- `read` - Mark messages as read

### Server -> Client

- `message` - Receive a new message
- `typing` - Receive typing indicator
- `status` - User online/offline status update
- `read` - Message read status update

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=10485760 # 10MB
ALLOWED_FILE_TYPES=image/*,application/pdf
```

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── websocket.js    # WebSocket handler
└── server.js       # App entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
