const CACHE_NAME = 'audio-player-cache-v4';
const assetsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './noise.mp3',
  './mel.mp3',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
          './',
          './index.html',
          './style.css',
          './script.js',
          './noise.mp3',
          './mel.mp3',
          './manifest.json',
          './icon-192.png',
          './icon-512.png'
        ]);
      }).catch((error) => {
        console.error('Failed to cache:', error);
      })
    );
  });


// Install event: Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(assetsToCache);
      })
    );
  });
  
  // Fetch event: Serve cached files when offline
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  
  // Activate event: Clean up old caches
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  });