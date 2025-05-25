const db = require('../db/db');

class ChatService {
  async saveMessage(message) {
    try {
      console.log('Saving message to database:', message);
    const [savedMessage] = await db('messages')
      .insert({
          sender_id: message.sender_id || message.senderId,
          receiver_id: message.receiver_id || message.receiverId,
        content: message.content,
          type: message.type || 'message',
          created_at: message.created_at || new Date().toISOString()
      })
      .returning('*');

      console.log('Message saved successfully:', savedMessage);
    return savedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async getMessageHistory(userId1, userId2) {
    try {
      console.log('Fetching message history between users:', { userId1, userId2 });
    const messages = await db('messages')
      .where(function() {
        this.where({
          sender_id: userId1,
          receiver_id: userId2
        }).orWhere({
          sender_id: userId2,
          receiver_id: userId1
        });
      })
        .orderBy('created_at', 'asc')
        .returning('*');

      console.log('Found messages:', messages.length);
    return messages;
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  }

  async getRecentChats(userId) {
    try {
      console.log('Fetching recent chats for user:', userId);
    const recentChats = await db('messages')
      .select(
        'users.id',
        'users.username',
        db.raw('MAX(messages.created_at) as last_message_time'),
        db.raw('COUNT(CASE WHEN messages.is_read = false AND messages.receiver_id = ? THEN 1 END) as unread_count', [userId])
      )
      .join('users', function() {
        this.on('users.id', '=', 'messages.sender_id')
          .orOn('users.id', '=', 'messages.receiver_id');
      })
      .where('messages.sender_id', userId)
      .orWhere('messages.receiver_id', userId)
      .whereNot('users.id', userId)
      .groupBy('users.id', 'users.username')
      .orderBy('last_message_time', 'desc');

      console.log('Found recent chats:', recentChats.length);
    return recentChats;
    } catch (error) {
      console.error('Error fetching recent chats:', error);
      throw error;
    }
  }

  async getContacts(userId) {
    const contacts = await db('users')
      .select('id', 'username', 'email')
      .whereNot('id', userId);

    return contacts;
  }

  async markMessageAsRead(messageId, userId) {
    await db('messages')
      .where({
        id: messageId,
        receiver_id: userId
      })
      .update({
        is_read: true,
        updated_at: db.fn.now()
      });
  }

  async getUnreadCount(userId) {
    const [result] = await db('messages')
      .count('id as count')
      .where({
        receiver_id: userId,
        is_read: false
      });

    return parseInt(result.count);
  }

  async deleteMessage(messageId, userId) {
    await db('messages')
      .where({
        id: messageId,
        sender_id: userId
      })
      .delete();
  }
}

module.exports = new ChatService(); 