self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('audio-cache').then((cache) => {
            return cache.addAll([
                '/index.html',
                '/styles.css',
                '/audio/noise.mp3',
            ]);
        })
    );
    console.log('Service Worker installed and resources cached');
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
