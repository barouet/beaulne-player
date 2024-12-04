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
let currentPlayingIndex = -1;  // Index of the currently playing audio, -1 means none

// Add these event listeners at the top level of your script
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('focus', handleFocus);
window.addEventListener('resume', handleResume);  // For PWA specific events

// Handle visibility changes
async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    await resumeAudioContext();
  }
}

// Handle window focus
async function handleFocus() {
  await resumeAudioContext();
}

// Handle PWA resume
async function handleResume() {
  await resumeAudioContext();
}

// Function to resume audio context
async function resumeAudioContext() {
  if (audioContext && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      console.log('AudioContext resumed successfully');
      if (resumeButton) resumeButton.style.display = 'none';
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
      if (resumeButton) resumeButton.style.display = 'block';
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
}

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

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer;

    if (!gainNode) {
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    }
    sourceNode.connect(gainNode);

    sourceNode.onended = () => {
      stopAudio();
    };

    sourceNode.start(0);

  } catch (error) {
    console.error('Error in playAudioFromIndexedDB:', error);
    // If there's an error, try recreating the audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

// Get all audio buttons
const audioButtons = Array.from(document.querySelectorAll('.audio-btn'));

// Single event handler for all audio buttons
audioButtons.forEach((button, index) => {
  button.addEventListener('click', async function() {
    // If this button is already active, stop the audio
    if (currentPlayingIndex === index) {
      stopAudio();
      this.classList.remove('active');
      currentPlayingIndex = -1;
      return;
    }

    // Stop any currently playing audio
    stopAudio();

    try {
      // Show loading state
      this.classList.add('loading');

      // Play new audio
      await playAudioFromIndexedDB(this.dataset.audio);
      currentPlayingIndex = index;

      // Update button state
      this.classList.remove('loading');
      this.classList.add('active');
    } catch (error) {
      console.error('Error playing audio:', error);
      this.classList.remove('loading', 'active');
      currentPlayingIndex = -1;
    }
  });
});

function stopAudio() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode = null;
  }
  if (currentPlayingIndex !== -1) {
    audioButtons[currentPlayingIndex].classList.remove('active');
  }
  currentPlayingIndex = -1;
}

// Volume slider
document.getElementById('volume-slider').addEventListener('input', (event) => {
  adjustVolume(event.target.value);
});

// Add this to your script
const resumeButton = document.getElementById('resume-audio');
if (resumeButton) {
  resumeButton.addEventListener('click', async () => {
    await resumeAudioContext();
    resumeButton.style.display = 'none';
  });
}
