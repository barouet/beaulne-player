import React, { useState, useRef, useEffect } from 'react';
import './styles.css';
const BASE_PATH = '/beaulne-player';

const AudioSelector = () => {
  const [playing, setPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [volume, setVolume] = useState(80);
  const [previousVolume, setPreviousVolume] = useState(80);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio();
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true'); // For older iOS versions
    audio.preload = 'auto';
    
    const enableAudio = () => {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, 22050);
      source.connect(context.destination);
      source.start(0);
      
      document.removeEventListener('touchstart', enableAudio);
      document.removeEventListener('touchend', enableAudio);
      document.removeEventListener('click', enableAudio);
    };

    document.addEventListener('touchstart', enableAudio);
    document.addEventListener('touchend', enableAudio);
    document.addEventListener('click', enableAudio);

    audioRef.current = audio;

    return () => {
      document.removeEventListener('touchstart', enableAudio);
      document.removeEventListener('touchend', enableAudio);
      document.removeEventListener('click', enableAudio);
    };
  }, []);

  const playSound = async (soundUrl) => {
    try {
      if (audioRef.current) {
        audioRef.current.src = soundUrl;
        await audioRef.current.load();
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error('Playback error:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const tracks = [
    { id: 1, title: "Welcome", duration: "2:30", src: `${BASE_PATH}/audio/noise.mp3` },
    { id: 2, title: "Artist", duration: "3:45", src: `${BASE_PATH}/audio/noise.mp3` },
    { id: 3, title: "Artwork", duration: "4:15", src: `${BASE_PATH}/audio/noise.mp3` }
  ];

  const handleTrackSelect = (track) => {
    if (selectedTrack?.id === track.id) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    } else {
      audioRef.current.src = track.src;
      audioRef.current.volume = volume / 100;
      audioRef.current.play();
      setSelectedTrack(track);
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
      audioRef.current.volume = 0;
    } else {
      setVolume(previousVolume);
      audioRef.current.volume = previousVolume / 100;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume / 100;
  };

  return (
    <div className="player-container">
      <div className="track-list">
        {tracks.map((track) => (
          <button
            key={track.id}
            onClick={() => handleTrackSelect(track)}
            className={`track-button ${selectedTrack?.id === track.id ? 'selected' : ''}`}
          >
            <div className="play-icon">
              {selectedTrack?.id === track.id && playing ? "⏸️" : "▶️"}
            </div>
            <div className="track-info">
              <div className="track-title">{track.title}</div>
              <div className="track-duration">{track.duration}</div>
            </div>
          </button>
        ))}
      </div>
      
      {selectedTrack && (
        <div className="volume-control">
          <button onClick={toggleMute}>
            {volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          <span className="volume-text">{volume}%</span>
        </div>
      )}
    </div>
  );
};

export default AudioSelector;