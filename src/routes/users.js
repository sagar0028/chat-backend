const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Get all users (protected route)
router.get('/', authenticateToken, userController.getAllUsers);

// Update user profile
router.put('/profile', authenticateToken, userController.updateProfile);

module.exports = router; 