require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const routes = require('./routes');
const WebSocketManager = require('./config/websocket');
require('./events/dbEventHandler'); // Initialize event handler

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
WebSocketManager.initialize(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 