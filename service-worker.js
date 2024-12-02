// service-worker.js

const CACHE_NAME = 'beaulne-player-cache-v2';
const ASSETS = [
    './index.html',
    './manifest.json',
    './styles.css',
    './script.js',
    './audio/noise.mp3'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Fetch event - serve cached files if available
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Handle navigation requests by serving cached index.html
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then((response) => {
                return response || fetch('./index.html');
            })
        );
        return;
    }

    // Serve audio files explicitly from cache
    if (requestUrl.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
        return;
    }

    // Default behavior for other requests
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Activate event - clear old caches
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