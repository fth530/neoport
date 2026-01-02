/**
 * Smart Notifications with Toast & System Fallback
 */

// Request Permission
function requestNotificationPermission() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('🔔 Notifications granted');
            }
        });
    }
}

// Send System Notification
function sendSystemNotification(title, options = {}) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/public/icons/icon-192.svg',
            badge: '/public/icons/icon-72.svg',
            vibrate: [100, 50, 100],
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

// Initial Request
document.addEventListener('DOMContentLoaded', () => {
    // Adding a small delay to not annoy user immediately
    setTimeout(requestNotificationPermission, 2000);
});

// Expose for Real-time features
window.sendSystemNotification = sendSystemNotification;
