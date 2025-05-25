const db = require('../db/db');

const getAllUsers = async (req, res) => {
  try {
    // Get all users except the current user
    const users = await db('users')
      .select('id', 'username', 'email')
      .where('id', '!=', req.user.id);

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, about, dob } = req.body;

    // Validate username is not taken by another user
    if (username) {
      const existingUser = await db('users')
        .where('username', username)
        .whereNot('id', userId)
        .first();

      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    // Update user profile
    const [updatedUser] = await db('users')
      .where('id', userId)
      .update({
        username: username || undefined,
        about: about || undefined,
        dob: dob || undefined,
        updated_at: db.fn.now()
      })
      .returning(['id', 'username', 'email', 'about', 'dob']);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  updateProfile
}; 