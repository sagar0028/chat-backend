const express = require('express');
const authRoutes = require('./auth');
const chatRoutes = require('./chat');
const userRoutes = require('./users');

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// Chat routes
router.use('/chat', chatRoutes);

// User routes
router.use('/users', userRoutes);

module.exports = router; 