const CACHE_NAME = 'beaulne-player-cache-v2';
const ASSETS = [
    '/beaulne-player/index.html',
    '/beaulne-player/manifest.json',
    '/beaulne-player/service-worker.js',
    '/beaulne-player/audio/noise.mp3',
    '/beaulne-player/styles.css',
    '/beaulne-player/script.js'
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
