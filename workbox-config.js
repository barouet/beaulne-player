module.exports = {
    globDirectory: 'build/',
    globPatterns: [
      '**/*.{html,js,css}',
      '**/*.{mp3,ogg}' // Include audio files
    ],
    swDest: 'build/service-worker.js',
    runtimeCaching: [{
      urlPattern: /\.(?:mp3|ogg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    }],
  };