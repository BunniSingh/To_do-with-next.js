/**
 * Notification utilities for chat messages
 */

// Play notification sound
export function playNotificationSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

// Request browser notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.warn('Notification permission denied:', error);
      return false;
    }
  }

  return false;
}

// Show browser notification
export function showBrowserNotification(title, body, icon = '/favicon.ico') {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/favicon.ico',
        tag: 'chat-message', // Prevent duplicate notifications
        requireInteraction: false,
        silent: true, // We play our own sound
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }
}

// Check if document is visible (tab is active)
export function isDocumentVisible() {
  return document.visibilityState === 'visible';
}

// Check if window is focused
export function isWindowFocused() {
  return document.hasFocus();
}

// Initialize notifications
export function initializeNotifications() {
  // Request permission on mount (user interaction required in some browsers)
  const handleUserInteraction = async () => {
    await requestNotificationPermission();
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };

  document.addEventListener('click', handleUserInteraction, { once: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true });
}
