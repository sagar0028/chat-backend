const { db } = require('../config/database');
const { redis } = require('../config/cache');

class MessageRepository {
  constructor() {
    this.cacheKeyPrefix = 'messages:';
    this.cacheTTL = 3600; // 1 hour in seconds
  }

  async saveMessage(message) {
    const [savedMessage] = await db('messages')
      .insert({
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        content: message.content,
        created_at: message.timestamp
      })
      .returning('*');

    // Invalidate relevant caches
    await this._invalidateMessageCache(message.senderId, message.receiverId);

    return savedMessage;
  }

  async getMessageHistory(userId1, userId2, page = 1, limit = 50) {
    const cacheKey = `${this.cacheKeyPrefix}${userId1}:${userId2}:${page}`;
    
    // Try to get from cache
    const cachedMessages = await redis.get(cacheKey);
    if (cachedMessages) {
      return JSON.parse(cachedMessages);
    }

    // Get from database
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
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    // Store in cache
    await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(messages));

    return messages;
  }

  async getRecentChats(userId) {
    const cacheKey = `${this.cacheKeyPrefix}recent:${userId}`;
    
    // Try to get from cache
    const cachedChats = await redis.get(cacheKey);
    if (cachedChats) {
      return JSON.parse(cachedChats);
    }

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

    // Store in cache with shorter TTL for recent chats
    await redis.setex(cacheKey, 300, JSON.stringify(recentChats)); // 5 minutes TTL

    return recentChats;
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

    // Invalidate relevant caches
    await this._invalidateUserCaches(userId);
  }

  async getUnreadCount(userId) {
    const cacheKey = `${this.cacheKeyPrefix}unread:${userId}`;
    
    // Try to get from cache
    const cachedCount = await redis.get(cacheKey);
    if (cachedCount !== null) {
      return parseInt(cachedCount);
    }

    const [result] = await db('messages')
      .count('id as count')
      .where({
        receiver_id: userId,
        is_read: false
      });

    const count = parseInt(result.count);
    
    // Store in cache with short TTL
    await redis.setex(cacheKey, 60, count.toString()); // 1 minute TTL

    return count;
  }

  async deleteMessage(messageId, userId) {
    await db('messages')
      .where({
        id: messageId,
        sender_id: userId
      })
      .delete();

    // Invalidate relevant caches
    await this._invalidateUserCaches(userId);
  }

  // Private methods for cache management
  async _invalidateMessageCache(userId1, userId2) {
    // Instead of using keys command, we'll directly delete the known cache keys
    const keysToDelete = [
      `${this.cacheKeyPrefix}${userId1}:${userId2}:1`,
      `${this.cacheKeyPrefix}${userId2}:${userId1}:1`,
      `${this.cacheKeyPrefix}recent:${userId1}`,
      `${this.cacheKeyPrefix}recent:${userId2}`,
      `${this.cacheKeyPrefix}unread:${userId1}`,
      `${this.cacheKeyPrefix}unread:${userId2}`
    ];

    await Promise.all(keysToDelete.map(key => redis.del(key)));
  }

  async _invalidateUserCaches(userId) {
    const keysToDelete = [
      `${this.cacheKeyPrefix}recent:${userId}`,
      `${this.cacheKeyPrefix}unread:${userId}`
    ];

    await Promise.all(keysToDelete.map(key => redis.del(key)));
  }
}

module.exports = new MessageRepository(); 