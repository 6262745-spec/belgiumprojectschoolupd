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
