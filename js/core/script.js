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

// --- SLIDE PROGRESS INDICATOR ---
const progressEl = document.getElementById('slide-progress');
const progressLabel = progressEl ? progressEl.querySelector('.slide-progress-label') : null;
const progressDots = progressEl ? progressEl.querySelector('.slide-progress-dots') : null;

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

if (progressDots) {
  for (let i = 0; i < slides.length; i++) {
    const dot = document.createElement('span');
    dot.className = 'slide-progress-dot';
    progressDots.appendChild(dot);
  }
}

function updateProgress(index) {
  if (!progressEl) return;

  if (progressLabel) {
    progressLabel.textContent = 'FILE ' + pad2(index + 1) + ' / ' + pad2(slides.length);
  }

  if (progressDots) {
    const dots = progressDots.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-active', i === index);
    }
  }

  // Keep the game screen clean
  progressEl.classList.toggle('is-hidden', !!slides[index].querySelector('#game'));
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
  updateProgress(currentSlideIndex);
  playIntroSlide();
});

function showSlide(index) {
  currentSlideIndex = index;

  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.toggle('active', i === index);
    slides[i].classList.toggle('prev', i < index);
  }

  updateProgress(index);

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

// --- DRAGGABLE TERMINALS ---
document.addEventListener("DOMContentLoaded", () => {
  const terminals = document.querySelectorAll(".terminal");
  let highestZ = 25;

  function pointerXY(e) {
    if (e.type.includes("touch")) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  terminals.forEach((terminal) => {
    const header = terminal.querySelector(".map-screen-header");
    if (!header) return;

    header.style.cursor = "move";

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function dragStart(e) {
      if (e.target.closest(".control-btn") || e.target.closest("button")) return;

      // Measure the REAL on-screen position (includes transforms like translateX(-50%))
      const parent = terminal.offsetParent || document.body;
      const r = terminal.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      initialLeft = r.left - pr.left - parent.clientLeft;
      initialTop = r.top - pr.top - parent.clientTop;

      // Stop any GSAP intro tween still holding a transform
      if (typeof gsap !== "undefined") gsap.killTweensOf(terminal);

      highestZ++;
      terminal.style.zIndex = highestZ;
      terminal.style.transform = "none";
      terminal.style.margin = "0";
      terminal.style.left = `${initialLeft}px`;
      terminal.style.top = `${initialTop}px`;
      terminal.style.right = "auto";
      terminal.style.bottom = "auto";
      terminal.classList.add("is-dragging");

      isDragging = true;
      const p = pointerXY(e);
      startX = p.x;
      startY = p.y;

      if (e.cancelable) e.preventDefault();
    }

    function dragMove(e) {
      if (!isDragging) return;

      const p = pointerXY(e);
      const parent = terminal.offsetParent || document.body;
      const maxLeft = parent.clientWidth - terminal.offsetWidth - 10;
      const maxTop = parent.clientHeight - terminal.offsetHeight - 10;

      const newLeft = Math.max(10, Math.min(initialLeft + p.x - startX, maxLeft));
      const newTop = Math.max(10, Math.min(initialTop + p.y - startY, maxTop));

      terminal.style.left = `${newLeft}px`;
      terminal.style.top = `${newTop}px`;
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      terminal.classList.remove("is-dragging");
    }

    header.addEventListener("mousedown", dragStart);
    window.addEventListener("mousemove", dragMove);
    window.addEventListener("mouseup", dragEnd);

    header.addEventListener("touchstart", dragStart, { passive: false });
    window.addEventListener("touchmove", dragMove, { passive: false });
    window.addEventListener("touchend", dragEnd);
  });
});

// --- GLOBAL GSAP CUSTOM CURSOR & FRY SPRITE ---
// GSAP only handles POSITION + OPACITY. All size/color changes are CSS classes
// with CSS transitions, so the two systems never fight over the same property.
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cursor = document.getElementById("gsap-cursor");
  const label = cursor ? cursor.querySelector(".gsap-cursor-label") : null;
  const frySprite = document.getElementById("gsap-sprite-fry");

  if (!cursor || typeof gsap === "undefined" || reduceMotion.matches || !finePointer.matches) return;

  document.body.classList.add("s1-has-cursor");
  gsap.set(cursor, { xPercent: -50, yPercent: -50 });

  const moveX = gsap.quickTo(cursor, "x", { duration: 0.1, ease: "power3.out" });
  const moveY = gsap.quickTo(cursor, "y", { duration: 0.1, ease: "power3.out" });

  const STATE_CLASSES = ["is-hl", "is-fries", "is-frame", "is-link", "is-btn", "is-range"];

  let visible = false;
  let fryBobTween = null;
  let fryRockTween = null;
  let currentState = null;
  let hoverBtn = null;
  let draggingRange = null;
  let mouseX = 0;
  let mouseY = 0;

  function rangePct(r) {
    const min = parseFloat(r.min) || 0;
    const max = parseFloat(r.max) || 1;
    return Math.round((parseFloat(r.value) - min) / (max - min) * 100) + "%";
  }

  function showCursor() {
    if (visible) return;
    visible = true;
    gsap.to(cursor, { opacity: 1, duration: 0.18, overwrite: "auto" });
  }

  function hideCursor() {
    visible = false;
    draggingRange = null;
    cursor.classList.remove("is-pressed");
    hideFrySprite();
    setCursorState(null, "", null);
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

  function setCursorState(state, text, btn) {
    btn = btn || null;
    if (currentState === state && hoverBtn === btn) {
      if (label && text !== undefined) label.textContent = text || "";
      return;
    }

    const leavingBtn = hoverBtn && !btn;
    currentState = state;
    hoverBtn = btn;

    cursor.classList.remove.apply(cursor.classList, STATE_CLASSES);

    if (btn) {
      // offsetWidth/Height ignore transforms, so the magnet effect can't distort the size
      const radius = window.getComputedStyle(btn).borderRadius;
      cursor.style.setProperty("--btn-w", (btn.offsetWidth + 10) + "px");
      cursor.style.setProperty("--btn-h", (btn.offsetHeight + 8) + "px");
      cursor.style.setProperty("--btn-r", radius && radius !== "0px" ? radius : "3px");
    }

    if (state) cursor.classList.add(state);
    if (label) label.textContent = text || "";

    // When leaving a button, glide back to the real pointer
    if (leavingBtn) {
      moveX(mouseX);
      moveY(mouseY);
    }
  }

  // Keep the outline centered on the hovered button, even while it moves (coin magnet)
  gsap.ticker.add(function () {
    if (!hoverBtn) return;
    const r = hoverBtn.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      // Button was hidden (e.g. landing closed) - release it
      setCursorState(null, "", null);
      return;
    }
    moveX(r.left + r.width / 2);
    moveY(r.top + r.height / 2);
  });

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!visible) {
      gsap.set(cursor, { x: mouseX, y: mouseY });
    }
    if (!hoverBtn) {
      moveX(mouseX);
      moveY(mouseY);
    }
    showCursor();
  });

  // Reliable "pointer left the window" detection
  document.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget) hideCursor();
  });
  window.addEventListener("blur", hideCursor);

  // Hover states with strict top-down priority
  document.addEventListener("mouseover", function (e) {
    if (draggingRange) return; // stay in slider mode while dragging
    const t = e.target;
    if (!t.closest) return;
    const btn = t.closest("button");
    const range = t.closest('input[type="range"]');

    if (t.closest("[data-sprite='fries']")) {
      setCursorState("is-fries", "", null);
    } else if (t.closest(".s1-figure")) {
      setCursorState("is-frame", "[GHENT]", null);
    } else if (t.closest("a, .hud-link")) {
      setCursorState("is-link", "[OPEN]", null);
    } else if (range) {
      setCursorState("is-range", rangePct(range), null);
    } else if (btn) {
      setCursorState("is-btn", "", btn);
    } else if (t.closest(".s1-hl, .s1-title, h1, h2, h3, p")) {
      setCursorState("is-hl", "", null);
    } else {
      setCursorState(null, "", null);
    }
  });

  // Live % readout while the slider moves
  document.addEventListener("input", function (e) {
    if (e.target.matches && e.target.matches('input[type="range"]') && currentState === "is-range" && label) {
      label.textContent = rangePct(e.target);
    }
  });

  // Press squash + keep slider mode during a drag
  document.addEventListener("mousedown", function (e) {
    cursor.classList.add("is-pressed");
    const range = e.target.closest && e.target.closest('input[type="range"]');
    if (range) draggingRange = range;
  });

  document.addEventListener("mouseup", function (e) {
    cursor.classList.remove("is-pressed");
    if (draggingRange) {
      draggingRange = null;
      // Re-check what's under the pointer now that the drag is over
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (under) under.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    }
  });

  // Fry sprite pop for elements with [data-sprite="fries"]
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