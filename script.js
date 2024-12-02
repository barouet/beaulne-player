// Function to store audio in localStorage
function saveAudioToLocalStorage(key, audioURL) {
    fetch(audioURL)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = function () {
          localStorage.setItem(key, reader.result); // Store Base64 string
          console.log(`${key} saved to localStorage`);
        };
        reader.readAsDataURL(blob); // Convert Blob to Base64
      })
      .catch((error) => console.error('Error saving audio:', error));
  }
  
  // Function to load audio from localStorage and play
  function playAudioFromLocalStorage(key) {
    const storedAudio = localStorage.getItem(key);
    if (storedAudio) {
      const audio = new Audio(storedAudio);
      audio.play();
    } else {
      console.error(`Audio not found in localStorage for key: ${key}`);
      alert('Audio file not available offline. Please save it first.');
    }
  }
  
  // Save the audio files to localStorage when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('audio1')) {
      saveAudioToLocalStorage('audio1', './noise.mp3');
    }
    if (!localStorage.getItem('audio2')) {
      saveAudioToLocalStorage('audio2', './noise.mp3');
    }
  });
  
  // Set up event listeners for play buttons
  document.getElementById('play-audio-1').addEventListener('click', () => {
    playAudioFromLocalStorage('audio1');
  });
  
  document.getElementById('play-audio-2').addEventListener('click', () => {
    playAudioFromLocalStorage('audio2');
  });