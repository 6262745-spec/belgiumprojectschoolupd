// script.js
const slides = document.querySelectorAll('.slide');
let currentSlideIndex = 0;

document.getElementById('btn-insert-coin').addEventListener('click', () => {
  document.getElementById('arcade-landing').style.display = 'none';
  document.getElementById('presentation-wrapper').style.display = 'block';
});

function showSlide(index) {
  currentSlideIndex = index;

  // You could use .forEach() but i'll leave it non-idiomatic for readability
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

// Swipe left/right to change slides on touch screens (not on the game slide)
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
    // Fade out
    subtitleElement.classList.add("fade-out");

    setTimeout(() => {
      // Switch text
      greetingIndex = (greetingIndex + 1) % multilingualGreetings.length;
      subtitleElement.textContent = multilingualGreetings[greetingIndex];
      
      // Fade back in
      subtitleElement.classList.remove("fade-out");
    }, 500); // This matches the 0.5s CSS transition time

  }, 3500); // Changes text every 3.5 seconds
}
