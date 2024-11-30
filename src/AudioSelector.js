import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import './styles.css';

const AudioSelector = () => {
  const [playing, setPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [volume, setVolume] = useState(80);
  const [previousVolume, setPreviousVolume] = useState(80);
  const audioRef = useRef(new Audio());

  const tracks = [
    { id: 1, title: "Welcome", duration: "2:30", src:`${process.env.PUBLIC_URL}/audio/Noise.wav`},
    { id: 2, title: "Artist", duration: "3:45", src: `${process.env.PUBLIC_URL}/audio/Noise.wav` },
    { id: 3, title: "Artwork", duration: "4:15", src: `${process.env.PUBLIC_URL}/audio/Noise.wav` }
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
              {selectedTrack?.id === track.id && playing ? (
                <Pause size={24} />
              ) : (
                <Play size={24} />
              )}
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
            {volume === 0 ? (
              <VolumeX size={24} />
            ) : (
              <Volume2 size={24} />
            )}
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
