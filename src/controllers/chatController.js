const chatService = require('../services/chatService');
const db = require('../db/db');
const { publisher } = require('../config/cache');

const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const messages = await chatService.getMessageHistory(currentUserId, userId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getRecentChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const recentChats = await db('messages')
      .where('sender_id', userId)
      .orWhere('receiver_id', userId)
      .orderBy('created_at', 'desc')
      .select('*')
      .limit(50);

    res.json({ chats: recentChats });
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getContacts = async (req, res) => {
  try {
    const contacts = await chatService.getContacts(req.user.id);
    res.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    // Get message details to find sender
    const message = await db('messages')
      .where('id', messageId)
      .first();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only mark as read if user is the receiver
    if (message.receiver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }

    // Mark message as read in database
    await db('messages')
      .where('id', messageId)
      .update({ is_read: true });

    // Get WebSocket instance for sender
    const senderWs = req.app.locals.wsManager?.clients.get(message.sender_id);
    
    // Send read receipt to sender via WebSocket
    if (senderWs) {
      senderWs.send(JSON.stringify({
        type: 'messageRead',
        messageId: messageId,
        readBy: userId,
        timestamp: new Date().toISOString()
      }));
    }

    // Publish to Redis for other server instances
    await publisher.publish('message_read', JSON.stringify({
      messageId,
      readBy: userId,
      timestamp: new Date().toISOString()
    }));

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    const messages = await chatService.getMessageHistory(currentUserId, otherUserId);
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getChatHistory,
  getRecentChats,
  getContacts,
  markMessageAsRead,
  getMessages
}; 