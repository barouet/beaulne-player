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
          resolve();
        };

        transaction.onerror = (event) => reject(event.target.error);
      })
      .catch((error) => reject(error));
  });
}

// Play audio from IndexedDB using Web Audio API
async function playAudioFromIndexedDB(key, expectedIndex) {
  console.log('playAudioFromIndexedDB called with key:', key, 'and expectedIndex:', expectedIndex);
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    let buffer;

    // Check if the index is still valid before proceeding
    if (currentPlayingIndex !== expectedIndex) {
      throw new Error('Another button was clicked');
      console.log('Another button was clicked');
    }

    if (audioBuffers.has(key)) {
      console.log(`Using cached buffer for ${key}`);
      buffer = audioBuffers.get(key);
    } else {
      console.log(audioBuffers);
      console.log(`Loading and decoding ${key} from IndexedDB`);
      const db = await openDatabase();
      const transaction = db.transaction('audio', 'readonly');
      const store = transaction.objectStore('audio');
      const request = store.get(key);

      buffer = await new Promise((resolve, reject) => {
        request.onsuccess = async (event) => {
          // Check again if the index is still valid
          if (currentPlayingIndex !== expectedIndex) {
            reject(new Error('Another button was clicked'));
            return;
          }

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

    // Final check before playing
    if (currentPlayingIndex !== expectedIndex) {
      throw new Error('Another button was clicked');
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer;

    if (!gainNode) {
      gainNode = audioContext.createGain();
      // Set initial volume based on slider value
      const volumeSlider = document.getElementById('volume-slider');
      if (volumeSlider) {
        gainNode.gain.value = volumeSlider.value;
      }
      gainNode.connect(audioContext.destination);
    }
    sourceNode.connect(gainNode);

    const buttonIndex = expectedIndex;  // Use the expected index
    sourceNode.onended = () => {
      console.log('Audio ended');
      // Check if the currentPlayingIndex matches the expectedIndex
      if (currentPlayingIndex === expectedIndex) {
        if (sourceNode) {
          sourceNode.stop();
          sourceNode = null;
        }
        // Only remove active class from the button that started this audio
        audioButtons[buttonIndex].classList.remove('active');
        // Reset currentPlayingIndex
        currentPlayingIndex = -1;
      }
    };

    sourceNode.start(0);

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

//
// DOMContentLoaded
//

document.addEventListener('DOMContentLoaded', async () => {
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
  const buttons = document.querySelectorAll('.play-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  });

  try {
    // First ensure files are in IndexedDB
    const db = await openDatabase();
    const transaction = db.transaction('audio', 'readonly');
    const store = transaction.objectStore('audio');
    const request = store.get('audio1');

    await new Promise((resolve, reject) => {
      request.onsuccess = async (event) => {
        if (!event.target.result) {
          console.log('Saving audio files to IndexedDB...');
          for (const [key, path] of Object.entries(audioFiles)) {
            try {
              await saveAudioToIndexedDB(key, path);
              console.log(`${key} saved to IndexedDB`);
            } catch (error) {
              console.error(`Error saving ${key}:`, error);
              reject(error);
              return;
            }
          }
        }
        resolve();
      };
      request.onerror = (event) => reject(event.target.error);
    });

    // Now cache all audio buffers
    console.log('Starting to cache audio buffers...');
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Wait for all buffers to be cached
    await Promise.all(Object.keys(audioFiles).map(async (key) => {
      try {
        if (!audioBuffers.has(key)) {
          const newDb = await openDatabase();  // Fresh connection for each operation
          const newTransaction = newDb.transaction('audio', 'readonly');
          const newStore = newTransaction.objectStore('audio');
          const audioData = await new Promise((resolve, reject) => {
            const request = newStore.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          if (audioData && audioData.file) {
            const arrayBuffer = await audioData.file.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers.set(key, decodedBuffer);
            console.log(`${key} cached successfully`);
          }
        }
      } catch (error) {
        console.error(`Error caching ${key}:`, error);
        throw error;  // Propagate error to Promise.all
      }
    }));

    console.log('Audio caching complete');
    
    // Only enable buttons after ALL caching is complete
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });

  } catch (error) {
    console.error('Error during initialization:', error);
    // Show error to user
  }
});

// Update button selection to use new structure
const audioButtons = Array.from(document.querySelectorAll('.audio-item'));

// Update button event listeners
audioButtons.forEach((item, index) => {
  const playBtn = item.querySelector('.play-btn');
  const playIcon = playBtn.querySelector('i');
  
  playBtn.addEventListener('click', async function() {
    console.log('Button clicked with index:', index);
    console.log('currentPlayingIndex:', currentPlayingIndex);
    
    if (currentPlayingIndex === index) {
      stopAllAudio();
      currentPlayingIndex = -1;
      return;
    }

    stopAllAudio();

    try {
      currentPlayingIndex = index;
      item.classList.add('loading');

      // Pass the index to playAudioFromIndexedDB
      await playAudioFromIndexedDB(item.dataset.audio, index);

      item.classList.remove('loading');
      item.classList.add('active');
      playIcon.classList.replace('fa-play', 'fa-stop');
    } catch (error) {
      console.error('Error playing audio:', error);
      item.classList.remove('loading', 'active');
      playIcon.classList.replace('fa-stop', 'fa-play');
      currentPlayingIndex = -1;
    }
  });
});

// Update the stop function
function stopAllAudio() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }
  // Reset all buttons to inactive state
  audioButtons.forEach(item => {
    item.classList.remove('active', 'loading');
    const icon = item.querySelector('.play-btn i');
    icon.classList.replace('fa-stop', 'fa-play');
  });
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

