// Register the Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}

let audioContext = null;  // Web Audio API context
let gainNode = null;     // Node to control volume
let sourceNode = null;   // Current audio source node
let audioBuffers = new Map();  // Cache for all decoded buffers

// Initialize IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AudioDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio', { keyPath: 'name' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Save audio to IndexedDB
async function saveAudioToIndexedDB(key, audioURL) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    fetch(audioURL)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch ${audioURL}`);
        return response.blob();
      })
      .then((blob) => {
        const transaction = db.transaction('audio', 'readwrite');
        const store = transaction.objectStore('audio');
        store.put({ name: key, file: blob });

        transaction.oncomplete = () => {
          console.log(`${key} saved to IndexedDB`);
          resolve();
        };

        transaction.onerror = (event) => reject(event.target.error);
      })
      .catch((error) => reject(error));
  });
}

// Play audio from IndexedDB using Web Audio API
async function playAudioFromIndexedDB(key) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    let buffer;

    // Get buffer (either from cache or IndexedDB)
    if (audioBuffers.has(key)) {
      buffer = audioBuffers.get(key);
    } else {
      const db = await openDatabase();
      const transaction = db.transaction('audio', 'readonly');
      const store = transaction.objectStore('audio');
      const request = store.get(key);

      buffer = await new Promise((resolve, reject) => {
        request.onsuccess = async (event) => {
          const result = event.target.result;
          if (!result || !result.file) {
            reject(new Error(`Audio file not found for key: ${key}`));
            return;
          }

          try {
            const arrayBuffer = await result.file.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers.set(key, decodedBuffer);
            resolve(decodedBuffer);
          } catch (error) {
            reject(error);
          }
        };

        request.onerror = () => reject(request.error);
      });
    }

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Create and configure source node
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer;

    // Set up gain node if needed
    if (!gainNode) {
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    }
    sourceNode.connect(gainNode);

    // Start playback
    sourceNode.start(0);

    sourceNode.onended = () => {
      sourceNode = null; // Clear the sourceNode when playback ends
      document.querySelectorAll('.audio-btn').forEach(btn => {
        btn.classList.remove('active');
      });
    };

  } catch (error) {
    console.error('Error in playAudioFromIndexedDB:', error);
    throw error;
  }
}

// Adjust volume dynamically
function adjustVolume(value) {
  if (gainNode) {
    gainNode.gain.value = value;
    console.log(`Volume adjusted to: ${value}`);
  }
}

// Save all audio files to IndexedDB on page load
document.addEventListener('DOMContentLoaded', () => {
  const audioFiles = {
    audio1: './noise.mp3',
    audio2: './mel.mp3',
    audio3: './noise.mp3',
    audio4: './mel.mp3',
    audio5: './noise.mp3',
    audio6: './mel.mp3',
    audio7: './noise.mp3',
    audio8: './mel.mp3'
  };

  // Check if files are already in IndexedDB before saving
  openDatabase().then(db => {
    const transaction = db.transaction('audio', 'readonly');
    const store = transaction.objectStore('audio');

    // Check for the presence of the first audio file as an indicator
    const request = store.get('audio1');

    request.onsuccess = (event) => {
      if (!event.target.result) {
        // Only save if files aren't already in IndexedDB
        console.log('Saving audio files to IndexedDB...');
        Object.entries(audioFiles).forEach(([key, path]) => {
          saveAudioToIndexedDB(key, path)
            .then(() => console.log(`${key} saved to IndexedDB`))
            .catch((error) => console.error(`Error saving ${key}:`, error));
        });
      } else {
        console.log('Audio files already in IndexedDB');
      }
    };

    request.onerror = (event) => {
      console.error('Error checking IndexedDB:', event.target.error);
    };
  });
});

// Single event handler for all audio buttons
document.querySelectorAll('.audio-btn').forEach(button => {
  button.addEventListener('click', async function() {
    const audioKey = this.dataset.audio;

    // Prevent multiple clicks while loading
    if (this.classList.contains('loading')) {
      return;
    }

    // Stop any currently playing audio
    if (sourceNode) {
      sourceNode.stop();
      sourceNode = null; // Clear the sourceNode to ensure no overlap
    }

    // Remove active class from all buttons
    document.querySelectorAll('.audio-btn').forEach(btn => {
      btn.classList.remove('active', 'loading');
    });

    try {
      // Show loading state
      this.classList.add('loading');

      // Play the audio
      await playAudioFromIndexedDB(audioKey);

      // Update button state
      this.classList.remove('loading');
      this.classList.add('active');

    } catch (error) {
      console.error('Error playing audio:', error);
      this.classList.remove('loading', 'active');
    }
  });
});

// Volume slider
document.getElementById('volume-slider').addEventListener('input', (event) => {
  adjustVolume(event.target.value);
});
