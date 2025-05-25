const { verifyToken } = require('./utils/jwt');
const { saveMessage } = require('./services/chatService');
const { db } = require('./db');

const clients = new Map();

const handleWebSocketConnection = (ws, req) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'auth':
          handleAuth(ws, data.token);
          break;
        
        case 'message':
          await handleMessage(ws, data);
          break;
        
        case 'typing':
          handleTyping(ws, data);
          break;
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    for (const [userId, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(userId);
        broadcastUserStatus(userId, false);
        break;
      }
    }
  });
};

const handleAuth = (ws, token) => {
  try {
    const decoded = verifyToken(token);
    clients.set(decoded.userId, ws);
    ws.userId = decoded.userId;
    ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
    broadcastUserStatus(decoded.userId, true);
  } catch (error) {
    ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'Invalid token' }));
  }
};

const handleMessage = async (ws, data) => {
  if (!ws.userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
    return;
  }

  const message = {
    senderId: ws.userId,
    receiverId: data.receiverId,
    content: data.content,
    timestamp: new Date()
  };

  // Save message to database
  await saveMessage(message);

  // Send to receiver if online
  const receiverWs = clients.get(data.receiverId);
  if (receiverWs) {
    receiverWs.send(JSON.stringify({
      type: 'message',
      message
    }));
  }

  // Confirm to sender
  ws.send(JSON.stringify({
    type: 'messageConfirmation',
    messageId: message.id
  }));
};

const handleTyping = (ws, data) => {
  if (!ws.userId) return;

  const receiverWs = clients.get(data.receiverId);
  if (receiverWs) {
    receiverWs.send(JSON.stringify({
      type: 'typing',
      userId: ws.userId,
      isTyping: data.isTyping
    }));
  }
};

const broadcastUserStatus = (userId, isOnline) => {
  for (const client of clients.values()) {
    if (client.userId !== userId) {
      client.send(JSON.stringify({
        type: 'userStatus',
        userId,
        isOnline
      }));
    }
  }
};

// Subscribe to Redis events
subscriber.subscribe('message_read', (err) => {
  if (err) {
    console.error('Redis subscription error:', err);
    return;
  }
});

subscriber.on('message', async (channel, message) => {
  try {
    const data = JSON.parse(message);
    
    switch (channel) {
      case 'message_read':
        // Get sender's WebSocket connection
        const messageData = await db('messages')
          .where('id', data.messageId)
          .first();

        if (messageData) {
          const senderWs = clients.get(messageData.sender_id);
          if (senderWs) {
            senderWs.send(JSON.stringify({
              type: 'messageRead',
              messageId: data.messageId,
              readBy: data.readBy,
              timestamp: data.timestamp
            }));
          }
        }
        break;
      // ... handle other channels
    }
  } catch (error) {
    console.error('Error processing Redis message:', error);
  }
});

module.exports = {
  handleWebSocketConnection
}; 