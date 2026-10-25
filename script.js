// script.js
const slides = document.querySelectorAll('.slide');
let currentSlideIndex = 0;

// Global Audio Volume Controls State
let masterBgmVolume = 0.7;
let masterSfxVolume = 0.8;

// Fade Timers
let bgmFadeTimer = null;
let quizFadeTimer = null;

// Universal SFX Player Helper with Volume Scaling
function playSfx(id) {
  const sound = document.getElementById(id);
  if (sound) {
    sound.volume = masterSfxVolume;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}

// Fade Audio Helpers
function fadeOutAudio(audioEl, duration = 600, callback) {
  if (!audioEl) return;
  clearInterval(bgmFadeTimer);
  const startVolume = audioEl.volume;
  const step = startVolume / (duration / 50);

  bgmFadeTimer = setInterval(() => {
    if (audioEl.volume > step) {
      audioEl.volume -= step;
    } else {
      audioEl.volume = 0;
      audioEl.pause();
      clearInterval(bgmFadeTimer);
      if (callback) callback();
    }
  }, 50);
}

function fadeInAudio(audioEl, targetVolume, duration = 600) {
  if (!audioEl) return;
  clearInterval(quizFadeTimer);
  audioEl.volume = 0;
  audioEl.play().catch(() => {});
  const step = targetVolume / (duration / 50);

  quizFadeTimer = setInterval(() => {
    if (audioEl.volume + step < targetVolume) {
      audioEl.volume += step;
    } else {
      audioEl.volume = targetVolume;
      clearInterval(quizFadeTimer);
    }
  }, 50);
}

// Bind click SFX to buttons & links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('button, .hud-link').forEach(btn => {
    btn.addEventListener('click', () => playSfx('sfx-click'));
  });

  // Setup Volume Sliders
  const bgmSlider = document.getElementById('slider-bgm-volume');
  const sfxSlider = document.getElementById('slider-sfx-volume');

  if (bgmSlider) {
    bgmSlider.addEventListener('input', (e) => {
      masterBgmVolume = parseFloat(e.target.value);
      const bgmPlayer = document.getElementById('bgm-player');
      if (bgmPlayer && !bgmPlayer.paused) {
        bgmPlayer.volume = masterBgmVolume;
      }
    });
  }

  if (sfxSlider) {
    sfxSlider.addEventListener('input', (e) => {
      masterSfxVolume = parseFloat(e.target.value);
    });
  }
});

document.getElementById('btn-insert-coin').addEventListener('click', () => {
  playSfx('sfx-click');
  document.getElementById('arcade-landing').style.display = 'none';
  document.getElementById('presentation-wrapper').style.display = 'block';
});

function showSlide(index) {
  currentSlideIndex = index;

  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.toggle('active', i === index);
    slides[i].classList.toggle('prev', i < index);
  }

  // Start the game when you arrive on its slide, stop it when you leave
  if (slides[index].querySelector('#game')) {
    window.resizeCanvas();
    window.startGame();
  } else {
    window.stopGame();
  }
}

window.addEventListener('keydown', (e) => {
  const onGameSlide = slides[currentSlideIndex].querySelector('#game');

  if (onGameSlide) {
    if (e.key === 'Escape') showSlide(currentSlideIndex - 1);
    return;
  }

  if (e.key === 'ArrowRight' && currentSlideIndex < slides.length - 1) {
    showSlide(currentSlideIndex + 1);
  } else if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
    showSlide(currentSlideIndex - 1);
  }
});

window.addEventListener('resize', () => {
  if (slides[currentSlideIndex].querySelector('#game')) {
    window.resizeCanvas();
  }
});

// Swipe left/right to change slides on touch screens
let touchStartX = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});

window.addEventListener('touchend', (e) => {
  if (slides[currentSlideIndex].querySelector('#game')) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  if (dx < -50 && currentSlideIndex < slides.length - 1) {
    showSlide(currentSlideIndex + 1);
  } else if (dx > 50 && currentSlideIndex > 0) {
    showSlide(currentSlideIndex - 1);
  }
});

document.getElementById('btn-exit').addEventListener('click', () => {
  showSlide(currentSlideIndex - 1);
});

// ---- Draggable Terminals Logic ----
document.querySelectorAll('.terminal').forEach(windowEl => {
  let isDragging = false;
  let startX, startY;

  const header = windowEl.querySelector('.map-screen-header');

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - windowEl.offsetLeft;
    startY = e.clientY - windowEl.offsetTop;
    
    windowEl.style.zIndex = 100; // Bring active window to front
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    windowEl.style.left = `${e.clientX - startX}px`;
    windowEl.style.top = `${e.clientY - startY}px`;
    windowEl.style.transform = 'none'; // Clear out CSS centering during drag
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
});

const multilingualGreetings = [
  "Hoe gaat het?",
  "Comment ça va?",
  "Wie geht's?",
  "How are you?"
];

let greetingIndex = 0;
const subtitleElement = document.getElementById("language-subtitle");

if (subtitleElement) {
  setInterval(() => {
    subtitleElement.classList.add("fade-out");

    setTimeout(() => {
      greetingIndex = (greetingIndex + 1) % multilingualGreetings.length;
      subtitleElement.textContent = multilingualGreetings[greetingIndex];
      subtitleElement.classList.remove("fade-out");
    }, 500);

  }, 3500);
}

// ---- Jukebox Terminal Audio Playlist ----
const playlist = [
  { name: "ARCADE_MUSIC_1.MP3", src: "assets/audio/music/arcademusic.mp3" },
  { name: "ARCADE_MUSIC_2.MP3", src: "assets/audio/music/arcademusic2.mp3" },
  { name: "ARCADE_MUSIC_3.MP3", src: "assets/audio/music/arcademusic3.mp3" },
  { name: "VHS_NOISE.MP3", src: "assets/audio/music/vhs-noise.mp3" }
];

let currentTrackIndex = 0;
const bgmPlayer = document.getElementById('bgm-player');
const trackToggleBtn = document.getElementById('btn-track-toggle');
const nowPlayingDisplay = document.getElementById('now-playing');
const nextTrackBtn = document.getElementById('btn-track-next');
const prevTrackBtn = document.getElementById('btn-track-prev');
let isPlaying = false;

function loadTrack(index) {
  bgmPlayer.src = playlist[index].src;
  if (isPlaying) {
    bgmPlayer.volume = masterBgmVolume;
    bgmPlayer.play().catch(err => console.log("Playback error:", err));
  }
}

if (trackToggleBtn && bgmPlayer) {
  trackToggleBtn.addEventListener('click', () => {
    if (isPlaying) {
      fadeOutAudio(bgmPlayer, 400);
      trackToggleBtn.textContent = "PLAY";
      nowPlayingDisplay.textContent = "TRACK: [MUTED]";
      isPlaying = false;
    } else {
      fadeInAudio(bgmPlayer, masterBgmVolume, 500);
      trackToggleBtn.textContent = "PAUSE";
      nowPlayingDisplay.textContent = `PLAYING: ${playlist[currentTrackIndex].name}`;
      isPlaying = true;
    }
  });

  nextTrackBtn.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
      nowPlayingDisplay.textContent = `PLAYING: ${playlist[currentTrackIndex].name}`;
    }
  });

  prevTrackBtn.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
      nowPlayingDisplay.textContent = `PLAYING: ${playlist[currentTrackIndex].name}`;
    }
  });
}
