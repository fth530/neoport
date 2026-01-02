const CACHE_NAME = 'neoport-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/public/js/app.js',
    '/public/icons/icon-192.svg',
    '/public/icons/icon-512.svg',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    '/public/offline.html'
];

// 1. Import IDB Helper
importScripts('/public/js/idb-helper.js');

// 2. Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 SW: Caching assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 3. Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 4. Message Event (Update Mechanism Fix)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 5. Background Sync Event (Sync transaction from Offline)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-transactions') {
        console.log('🔄 SW: Background Sync triggered');
        event.waitUntil(syncTransactions());
    }
});

async function syncTransactions() {
    try {
        const transactions = await idbHelper.getAllTransactions();
        for (const tx of transactions) {
            try {
                // Send to API
                await fetch('/api/v1/assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tx)
                });
                // Delete from IDB on success
                await idbHelper.deleteTransaction(tx.id);
            } catch (err) {
                console.error('❌ Sync failed for tx:', tx.id, err);
            }
        }

        // Notify clients about sync completion
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_COMPLETED', count: transactions.length });
        });

    } catch (error) {
        console.error('❌ Sync Error:', error);
    }
}

// 6. Push Notification Event
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'NeoPort', body: 'Yeni bildiriminiz var' };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/public/icons/icon-192.svg',
            badge: '/public/icons/icon-192.svg',
            data: { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// 7. Fetch Event
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API Calls: Network First
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Navigation: Network First -> Cache -> Offline Page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then((response) => {
                            if (response) return response;
                            return caches.match('/public/offline.html');
                        });
                })
        );
        return;
    }

    // Static Assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
