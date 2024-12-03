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
            sourceNode.stop();
          }

          sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = buffer;

          // Add ended event listener
          sourceNode.onended = () => {
            document.querySelectorAll('.audio-btn').forEach(btn => {
              btn.classList.remove('active');
            });
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

// Save audio files to IndexedDB on page load
document.addEventListener('DOMContentLoaded', () => {
  saveAudioToIndexedDB('audio1', './noise.mp3')
    .then(() => console.log('audio1 saved to IndexedDB'))
    .catch((error) => console.error('Error saving audio1:', error));

  saveAudioToIndexedDB('audio2', './mel.mp3')
    .then(() => console.log('audio2 saved to IndexedDB'))
    .catch((error) => console.error('Error saving audio2:', error));
});

// Play buttons
document.querySelectorAll('.audio-btn').forEach(button => {
  button.addEventListener('click', function() {
    // Remove active class from all buttons
    document.querySelectorAll('.audio-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    this.classList.add('active');
    
    // Your existing audio playing logic here
  });
});

// Volume slider
document.getElementById('volume-slider').addEventListener('input', (event) => {
  adjustVolume(event.target.value);
});

// Update the play buttons event listeners
document.getElementById('play-audio-1').addEventListener('click', async function() {
  document.querySelectorAll('.audio-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  this.classList.add('active');
  await playAudioFromIndexedDB('audio1');
});

document.getElementById('play-audio-2').addEventListener('click', async function() {
  document.querySelectorAll('.audio-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  this.classList.add('active');
  await playAudioFromIndexedDB('audio2');
});
