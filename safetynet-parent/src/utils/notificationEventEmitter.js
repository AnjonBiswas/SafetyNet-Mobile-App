/**
 * Simple notification event emitter for React Native
 * Allows components to trigger notifications from anywhere
 */
class NotificationEventEmitter {
  constructor() {
    this.listeners = [];
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    console.log('[NotificationEmitter] Emitting event:', event, 'with data:', data);
    console.log('[NotificationEmitter] Listeners for', event, ':', this.listeners[event]?.length || 0);
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          console.log('[NotificationEmitter] Calling listener for', event);
          callback(data);
        } catch (error) {
          console.error('[NotificationEmitter] Error in listener:', error);
        }
      });
    } else {
      console.warn('[NotificationEmitter] No listeners registered for event:', event);
    }
  }
}

const notificationEmitter = new NotificationEventEmitter();

export default notificationEmitter;
