const bcrypt = require('bcrypt');
const db = require('../db/db');
const { generateToken } = require('../utils/jwt');

class AuthService {
  async registerUser({ username, email, password }) {
    // Check if user already exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      const error = new Error('User already exists');
      error.status = 400;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db('users')
      .insert({
        username,
        email,
        password: hashedPassword
      })
      .returning(['id', 'username', 'email']);

    // Generate token
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    };
  }

  async loginUser({ email, password }) {
    // Find user
    const user = await db('users').where({ email }).first();
    if (!user) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    // Generate token
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    };
  }
}

module.exports = new AuthService(); 