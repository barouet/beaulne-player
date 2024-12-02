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
    if (event.request.mode === 'navigate') {
        // Serve index.html for navigation requests
        event.respondWith(
            caches.match('./index.html').then((response) => {
                return response || fetch('./index.html');
            })
        );
    } else {
        // Handle other requests (e.g., static assets and audio files)
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    // Cache the fetched response dynamically
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
    }
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