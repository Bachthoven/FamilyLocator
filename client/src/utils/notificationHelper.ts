// Notification helper that works on both desktop and mobile

export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isStandalonePWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

export const initializeServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    serviceWorkerRegistration = registration;
    console.log('Service Worker registered successfully');
    return true;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export const showNotification = async (
  title: string,
  options: NotificationOptions = {}
): Promise<boolean> => {
  // Check permission first
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Default options
  const defaultOptions: NotificationOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options
  };

  try {
    // On mobile or when service worker is available, use Service Worker
    if (isMobileDevice() || serviceWorkerRegistration) {
      if (!serviceWorkerRegistration) {
        // Try to get existing registration
        const registration = await navigator.serviceWorker.ready;
        serviceWorkerRegistration = registration;
      }

      if (serviceWorkerRegistration) {
        console.log('Using Service Worker for notification');
        await serviceWorkerRegistration.showNotification(title, defaultOptions);
        return true;
      }
    }

    // On desktop, try direct Notification API
    if (!isMobileDevice()) {
      console.log('Using direct Notification API');
      const notification = new Notification(title, defaultOptions);
      
      // Auto-close after 8 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 8000);
      }

      return true;
    }

    console.log('No suitable notification method available');
    return false;
  } catch (error) {
    console.error('Error showing notification:', error);
    
    // Fallback: Try Service Worker if direct API failed
    if (serviceWorkerRegistration) {
      try {
        console.log('Fallback to Service Worker notification');
        await serviceWorkerRegistration.showNotification(title, defaultOptions);
        return true;
      } catch (swError) {
        console.error('Service Worker notification also failed:', swError);
      }
    }
    
    return false;
  }
};

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeServiceWorker().catch(console.error);
}