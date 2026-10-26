// script.js
const slides = document.querySelectorAll('.slide');
let currentSlideIndex = 0;
let masterBgmVolume = 0.7;
let masterSfxVolume = 0.8;

let bgmFadeTimer = null;
let quizFadeTimer = null;

function playSfx(id) {
  const sound = document.getElementById(id);
  if (sound) {
    sound.volume = masterSfxVolume;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}

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

function presentationIsOpen() {
  return document.getElementById('presentation-wrapper').style.display !== 'none';
}

function playIntroSlide() {
  if (window.Slide1) window.Slide1.play();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('button, .hud-link').forEach(btn => {
    btn.addEventListener('click', () => playSfx('sfx-click'));
  });

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
  // Click sound is already played by the generic button listener above
  document.getElementById('arcade-landing').style.display = 'none';
  document.getElementById('presentation-wrapper').style.display = 'block';
  playIntroSlide();
});

function showSlide(index) {
  currentSlideIndex = index;

  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.toggle('active', i === index);
    slides[i].classList.toggle('prev', i < index);
  }

  if (index === 0) {
    playIntroSlide();
  } else if (window.Slide1) {
    window.Slide1.stop();
  }

  if (slides[index].querySelector('#game')) {
    window.resizeCanvas();
    window.startGame();
  } else {
    window.stopGame();
  }
}

window.addEventListener('keydown', (e) => {
  if (!presentationIsOpen()) return;

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

let touchStartX = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});

window.addEventListener('touchend', (e) => {
  if (!presentationIsOpen()) return;
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

document.addEventListener("DOMContentLoaded", () => {
  const terminals = document.querySelectorAll(".terminal");
  let highestZ = 25;

  terminals.forEach((terminal) => {
    const header = terminal.querySelector(".map-screen-header");
    if (!header) return;

    header.style.cursor = "move";

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function dragStart(e) {
      if (e.target.closest(".control-btn") || e.target.closest("button")) return;

      highestZ++;
      terminal.style.zIndex = highestZ;

      // FIX: Capture position based strictly on its layout offset parent, ignoring window scroll/flex positioning
      initialLeft = terminal.offsetLeft;
      initialTop = terminal.offsetTop;

      // Force positions to lock precisely onto calculated relative layout spots
      terminal.style.transform = "none";
      terminal.style.margin = "0";
      terminal.style.left = `${initialLeft}px`;
      terminal.style.top = `${initialTop}px`;
      terminal.style.right = "auto";
      terminal.style.bottom = "auto";

      isDragging = true;

      const clientX = e.type.includes("touch") ? e.touches.clientX : e.clientX;
      const clientY = e.type.includes("touch") ? e.touches.clientY : e.clientY;

      startX = clientX;
      startY = clientY;

      if (e.cancelable) e.preventDefault();
    }

    function dragMove(e) {
      if (!isDragging) return;

      const clientX = e.type.includes("touch") ? e.touches.clientX : e.clientX;
      const clientY = e.type.includes("touch") ? e.touches.clientY : e.clientY;

      // Calculate shift from click starting point
      const dx = clientX - startX;
      const dy = clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Clamp layouts within parent box limits so they don't break arcade boundaries
      const parent = terminal.offsetParent || document.body;
      const maxLeft = parent.clientWidth - terminal.offsetWidth - 10;
      const maxTop = parent.clientHeight - terminal.offsetHeight - 10;
      
      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      terminal.style.left = `${newLeft}px`;
      terminal.style.top = `${newTop}px`;
    }

    function dragEnd() {
      isDragging = false;
    }

    // Mouse Listeners
    header.addEventListener("mousedown", dragStart);
    window.addEventListener("mousemove", dragMove);
    window.addEventListener("mouseup", dragEnd);

    // Touch Listeners
    header.addEventListener("touchstart", dragStart, { passive: false });
    window.addEventListener("touchmove", dragMove, { passive: false });
    window.addEventListener("touchend", dragEnd);
  });
});

// --- CURSOR ---
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cursor = document.getElementById("gsap-cursor");
  const label = cursor ? cursor.querySelector(".gsap-cursor-label") : null;
  const frySprite = document.getElementById("gsap-sprite-fry");

  if (!cursor || reduceMotion.matches || !finePointer.matches) return;

  document.body.classList.add("s1-has-cursor");
  gsap.set(cursor, { xPercent: -50, yPercent: -50 });

  const moveX = gsap.quickTo(cursor, "x", { duration: 0.22, ease: "power3.out" });
  const moveY = gsap.quickTo(cursor, "y", { duration: 0.22, ease: "power3.out" });

  let visible = false;
  let fryBobTween = null;
  let fryRockTween = null;

  function showCursor() {
    if (visible) return;
    visible = true;
    gsap.to(cursor, { opacity: 1, duration: 0.18, overwrite: "auto" });
  }

  function hideCursor() {
    visible = false;
    hideFrySprite();
    gsap.to(cursor, { opacity: 0, duration: 0.2, overwrite: "auto" });
  }

  function showFrySprite() {
    if (!frySprite) return;
    if (fryBobTween) fryBobTween.kill();
    if (fryRockTween) fryRockTween.kill();
    gsap.killTweensOf(frySprite);

    gsap.fromTo(frySprite,
      { opacity: 0, scale: 0.2, y: 14, rotation: -18 },
      {
        opacity: 1, scale: 1, y: 0, rotation: -6,
        duration: 0.34, ease: "back.out(2.2)",
        onComplete: function () {
          fryBobTween = gsap.to(frySprite, { y: -9, duration: 0.55, yoyo: true, repeat: -1, ease: "sine.inOut" });
          fryRockTween = gsap.to(frySprite, { rotation: 8, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
      }
    );
  }

  function hideFrySprite() {
    if (!frySprite) return;
    if (fryBobTween) { fryBobTween.kill(); fryBobTween = null; }
    if (fryRockTween) { fryRockTween.kill(); fryRockTween = null; }
    gsap.to(frySprite, { opacity: 0, scale: 0.35, y: 10, rotation: 12, duration: 0.2, ease: "power2.in", overwrite: "auto" });
  }

  function setCursorState(state, text) {
      cursor.classList.remove("is-hl", "is-fries", "is-frame", "is-link", "is-btn");
      if (state) cursor.classList.add(state);
      if (label) label.textContent = text || "";
    }

    // Universal hover state checks for any slide element
    document.addEventListener("mouseover", function (e) {
      if (!presentationIsOpen()) return;
      const t = e.target;

      if (t.closest("a")) {
        setCursorState("is-link", "[OPEN]");
      } else if (t.closest("button") || t.closest(".music-btn") || t.closest(".insert-coin-btn")) {
        // Expands the box size like a link, but uses 'is-btn' so it doesn't fill solid
        setCursorState("is-btn", "");
      } else if (t.closest("[data-sprite='fries']")) {
        setCursorState("is-fries", "");
      } else if (t.closest(".s1-figure")) {
        setCursorState("is-frame", "[GHENT]");
      } else if (t.closest(".s1-hl, .s1-title, p, h1, h2, h3")) {
        setCursorState("is-hl", "");
      } else {
        setCursorState(null, "");
      }
    });

  // Track mouse movement globally across the entire page (landing + presentation)
  document.addEventListener("mousemove", function (e) {
    if (!visible) {
      gsap.set(cursor, { x: e.clientX, y: e.clientY });
    }
    moveX(e.clientX);
    moveY(e.clientY);
    showCursor();
  });

  document.addEventListener("mouseleave", hideCursor);

  document.addEventListener("mouseover", function (e) {
    const t = e.target;

    if (t.closest("a")) {
      setCursorState("is-link", "[OPEN]");
    } else if (t.closest("button") || t.closest(".music-btn") || t.closest(".insert-coin-btn")) {
      // Expands the box normally on ALL buttons without filling solid or showing text
      setCursorState("is-btn", "");
    } else if (t.closest("[data-sprite='fries']")) {
      setCursorState("is-fries", "");
    } else if (t.closest(".s1-figure")) {
      setCursorState("is-frame", "[GHENT]");
    } else if (t.closest(".s1-hl, .s1-title, p, h1, h2, h3")) {
      setCursorState("is-hl", "");
    } else {
      setCursorState(null, "");
    }
  });

  // Bind fry sprite pop to elements with [data-sprite="fries"] across the presentation
  document.addEventListener("mouseenter", function (e) {
    if (e.target.closest && e.target.closest("[data-sprite='fries']")) {
      showFrySprite();
    }
  }, true);

  document.addEventListener("mouseleave", function (e) {
    if (e.target.closest && e.target.closest("[data-sprite='fries']")) {
      hideFrySprite();
    }
  }, true);
});