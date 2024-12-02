let currentAudio = null; // Track the currently playing audio
let audioVolume = 0.5; // Default volume

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

// Play audio from IndexedDB
async function playAudioFromIndexedDB(key) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('audio', 'readonly');
    const store = transaction.objectStore('audio');
    const request = store.get(key);

    request.onsuccess = (event) => {
      const result = event.target.result;
      if (result && result.file) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        const audioURL = URL.createObjectURL(result.file);
        const audio = new Audio(audioURL);
        audio.volume = audioVolume; // Set volume to slider value
        currentAudio = audio;

        audio.play()
          .then(() => {
            console.log(`Playing ${key}`);
            resolve();
          })
          .catch((error) => reject(error));
      } else {
        alert(`Audio file not available offline for key: ${key}`);
        reject(`Audio file not found for key: ${key}`);
      }
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

// Save the audio files to IndexedDB when the page loads
document.addEventListener('DOMContentLoaded', () => {
  saveAudioToIndexedDB('audio1', './noise.mp3')
    .then(() => console.log('audio1 saved to IndexedDB'))
    .catch((error) => console.error('Error saving audio1:', error));

  saveAudioToIndexedDB('audio2', './mel.mp3')
    .then(() => console.log('audio2 saved to IndexedDB'))
    .catch((error) => console.error('Error saving audio2:', error));
});

// Set up event listeners for play buttons
document.getElementById('play-audio-1').addEventListener('click', () => {
  playAudioFromIndexedDB('audio1')
    .catch((error) => console.error('Error playing audio1:', error));
});

document.getElementById('play-audio-2').addEventListener('click', () => {
  playAudioFromIndexedDB('audio2')
    .catch((error) => console.error('Error playing audio2:', error));
});

// Set up event listener for volume slider
document.getElementById('volume-slider').addEventListener('input', (event) => {
  audioVolume = event.target.value;
  if (currentAudio) {
    currentAudio.volume = audioVolume;
  }
});
