// script.js
const slides = document.querySelectorAll('.slide');
let currentSlideIndex = 0;

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

// Touch: swipe left/right to change slides, or tap the right/left side of the screen
const SWIPE_MIN = 50;
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (slides[currentSlideIndex].querySelector('#game')) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  let direction = 0;

  if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
    direction = dx < 0 ? 1 : -1;   // swipe left goes forward
  } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    direction = touchStartX > window.innerWidth / 3 ? 1 : -1;
  }

  const target = currentSlideIndex + direction;
  if (direction !== 0 && target >= 0 && target < slides.length) {
    showSlide(target);
  }
});

document.getElementById('btn-back').addEventListener('click', () => {
  showSlide(currentSlideIndex - 1);
});
