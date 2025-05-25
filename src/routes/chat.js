const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Get chat history with a specific user
router.get('/history/:userId', authenticateToken, chatController.getChatHistory);

// Get list of recent chats
router.get('/recent', authenticateToken, chatController.getRecentChats);

// Get user's contacts/friends
router.get('/contacts', authenticateToken, chatController.getContacts);

// Mark message as read
router.put('/messages/:messageId/read', authenticateToken, chatController.markMessageAsRead);

// Get chat messages between two users
router.get('/messages/:userId', authenticateToken, chatController.getMessages);

module.exports = router; 