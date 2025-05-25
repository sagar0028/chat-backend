const { subscriber, publisher } = require('../config/cache');
const messageRepository = require('../repositories/messageRepository');

class DbEventHandler {
  constructor() {
    this.subscribeToEvents();
  }

  subscribeToEvents() {
    subscriber.on('message', async (channel, message) => {
      switch (channel) {
        case 'db_messages':
          await this.handleMessageSave(JSON.parse(message));
          break;
        case 'message_read':
          await this.handleMessageRead(JSON.parse(message));
          break;
        case 'message_delete':
          await this.handleMessageDelete(JSON.parse(message));
          break;
      }
    });

    subscriber.subscribe('db_messages', 'message_read', 'message_delete');
  }

  async handleMessageSave(message) {
    try {
      await messageRepository.saveMessage(message);
      // Publish success event
      await publisher.publish('message_saved', JSON.stringify({
        messageId: message.id,
        status: 'success'
      }));
    } catch (error) {
      console.error('Error saving message:', error);
      // Publish failure event
      await publisher.publish('message_saved', JSON.stringify({
        messageId: message.id,
        status: 'error',
        error: error.message
      }));
    }
  }

  async handleMessageRead(data) {
    try {
      await messageRepository.markMessageAsRead(data.messageId, data.userId);
      await publisher.publish('message_status_updated', JSON.stringify({
        messageId: data.messageId,
        status: 'read'
      }));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async handleMessageDelete(data) {
    try {
      await messageRepository.deleteMessage(data.messageId, data.userId);
      await publisher.publish('message_deleted', JSON.stringify({
        messageId: data.messageId,
        status: 'success'
      }));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }
}

module.exports = new DbEventHandler(); 