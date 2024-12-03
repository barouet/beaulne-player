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

let audioContext = null; // Web Audio API context
let gainNode = null; // Node to control volume
let sourceNode = null; // Current audio source node
let currentBuffer = null; // Cached audio buffer for the current file

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

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('audio', 'readonly');
    const store = transaction.objectStore('audio');
    const request = store.get(key);

    request.onsuccess = async (event) => {
      const result = event.target.result;
      if (result && result.file) {
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const arrayBuffer = await result.file.arrayBuffer();
        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
          currentBuffer = buffer;

          if (sourceNode) {
            sourceNode.isPlaying = false;
            sourceNode.stop();
          }

          sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = buffer;
          sourceNode.isPlaying = true;

          sourceNode.onended = () => {
            sourceNode.isPlaying = false;
            if (!sourceNode.isPlaying) {
              document.querySelectorAll('.audio-btn').forEach(btn => {
                btn.classList.remove('active');
              });
            }
          };

          if (!gainNode) {
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
          }
          sourceNode.connect(gainNode);

          sourceNode.start(0);
          console.log(`Playing ${key}`);
          resolve();
        });
      } else {
        console.error(`Audio file not found for key: ${key}`);
        reject(`Audio file not found for key: ${key}`);
      }
    };

    request.onerror = (event) => reject(event.target.error);
  });
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

  // Save all audio files
  Object.entries(audioFiles).forEach(([key, path]) => {
    saveAudioToIndexedDB(key, path)
      .then(() => console.log(`${key} saved to IndexedDB`))
      .catch((error) => console.error(`Error saving ${key}:`, error));
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
    
    // If this button is active (playing), stop the audio
    if (this.classList.contains('active')) {
      if (sourceNode) {
        sourceNode.stop();
        sourceNode.isPlaying = false;
      }
      this.classList.remove('active');
      return;
    }

    // Remove loading and active classes from all buttons first
    document.querySelectorAll('.audio-btn').forEach(btn => {
      btn.classList.remove('loading', 'active');
    });

    // If another audio is playing, stop it
    if (sourceNode) {
      sourceNode.stop();
      sourceNode.isPlaying = false;
    }

    try {
      this.classList.add('loading');
      await playAudioFromIndexedDB(audioKey);
      this.classList.remove('loading');
      this.classList.add('active');
    } catch (error) {
      console.error('Error playing audio:', error);
      this.classList.remove('loading');
    }
  });
});

// Volume slider
document.getElementById('volume-slider').addEventListener('input', (event) => {
  adjustVolume(event.target.value);
});
