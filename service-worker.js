// service-worker.js

const CACHE_NAME = 'beaulne-player-cache-v1';
const ASSETS = [
    './index.html',
    './manifest.json',
    './audio/noise.mp3',
    './styles.css',
    './script.js'
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
        // Intercept navigation requests and serve cached index.html
        event.respondWith(
            caches.match('./index.html').then((response) => {
                return response || fetch('./index.html');
            })
        );
    } else {
        // Serve other assets from cache
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
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