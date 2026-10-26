// landing.js - Landing page intro animation, magnetic INSERT COIN button
// and coin-drop transition into Slide 1.
// Load AFTER script.js. The original INSERT COIN click handler in
// script.js is kept: this file plays an animation first, then lets the click through.

(function () {
  const html = document.documentElement;
  const landing = document.getElementById("arcade-landing");
  const btn = document.getElementById("btn-insert-coin");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function reveal() {
    html.classList.remove("boot");
  }

  if (typeof gsap === "undefined" || !landing) {
    reveal();
    return;
  }

  const header = landing.querySelector(".landing-header");
  const label = landing.querySelector(".landing-label");
  const title = landing.querySelector(".game-title");
  const subtitle = landing.querySelector(".subtitle");
  const warning = landing.querySelector(".mobile-desktop-warning");
  const hud = landing.querySelector(".screen-hud-topleft");
  const hudRows = hud ? Array.from(hud.children) : [];
  const terminals = Array.from(landing.querySelectorAll(".terminal"));
  const coinWrap = landing.querySelector(".insert-coin-container");
  const magnet = landing.querySelector(".coin-magnet");
  const symbol = btn ? btn.querySelector(".coin-symbol") : null;
  const coinLabel = btn ? btn.querySelector(".coin-label") : null;
  const credits = document.getElementById("hud-credits");

  // ---------------------------------------------
  // SPLIT TITLE INTO LETTERS
  // ---------------------------------------------
  function splitChars(el) {
    if (!el || el.dataset.split === "1") return;
    el.dataset.split = "1";

    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";

    words.forEach(function (word, i) {
      const mask = document.createElement("span");
      mask.className = "l-mask";
      for (const ch of word) {
        const c = document.createElement("span");
        c.className = "l-char";
        c.textContent = ch;
        mask.appendChild(c);
      }
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  // ---------------------------------------------
  // 1. INTRO ANIMATION
  // ---------------------------------------------
  function boot() {
    splitChars(title);

    if (reduce) {
      reveal();
      return;
    }

    const titleChars = title ? title.querySelectorAll(".l-char") : [];
    const cleanup = [label, subtitle, warning, magnet].concat(hudRows, terminals)
      .filter(Boolean);

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: function () {
        // Remove inline styles so script.js (subtitle fades, dragging) works as before
        gsap.set(cleanup, { clearProps: "opacity,transform,clipPath" });
        gsap.set(titleChars, { clearProps: "transform" });
      }
    });

    if (label) tl.from(label, { opacity: 0, y: 8, duration: 0.5 }, 0);
    if (titleChars.length) {
      tl.from(titleChars, { yPercent: 110, duration: 0.9, stagger: 0.035, ease: "expo.out" }, 0.1);
    }
    const subs = [subtitle, warning].filter(Boolean);
    if (subs.length) tl.from(subs, { opacity: 0, duration: 0.6, stagger: 0.1 }, 0.6);
    if (hudRows.length) tl.from(hudRows, { opacity: 0, x: -10, duration: 0.4, stagger: 0.06 }, 0.4);

    // Windows open top-down using clip-path only (no transforms, so dragging is unaffected)
    if (terminals.length) {
      tl.from(terminals, {
        opacity: 0,
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 0.7,
        stagger: 0.12,
        ease: "power4.out"
      }, 0.5);
    }
    if (magnet) tl.from(magnet, { opacity: 0, y: 12, duration: 0.6 }, 1.1);

    // from() tweens have already applied their start states, so it is safe to show the page
    reveal();
  }

  boot();

  // ---------------------------------------------
  // 2a. MAGNETIC INSERT COIN BUTTON
  // ---------------------------------------------
  let launching = false;

  if (btn && magnet && !reduce && finePointer) {
    const RADIUS = 140; // px around the button where the pull starts
    const PULL = 0.3;   // how far it follows the cursor (0-1)
    const moveX = gsap.quickTo(magnet, "x", { duration: 0.5, ease: "power3.out" });
    const moveY = gsap.quickTo(magnet, "y", { duration: 0.5, ease: "power3.out" });

    landing.addEventListener("mousemove", function (e) {
      if (launching) return;
      const r = btn.getBoundingClientRect();
      // Remove the current pull so we measure the button's resting position
      const cx = r.left + r.width / 2 - gsap.getProperty(magnet, "x");
      const cy = r.top + r.height / 2 - gsap.getProperty(magnet, "y");
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      if (Math.hypot(dx, dy) < RADIUS + r.width / 2) {
        moveX(dx * PULL);
        moveY(dy * PULL);
      } else {
        moveX(0);
        moveY(0);
      }
    });

    landing.addEventListener("mouseleave", function () {
      moveX(0);
      moveY(0);
    });

    if (symbol) {
      btn.addEventListener("mouseenter", function () {
        gsap.to(symbol, { rotation: 90, duration: 0.4, ease: "back.out(3)", overwrite: "auto" });
      });
      btn.addEventListener("mouseleave", function () {
        gsap.to(symbol, { rotation: 0, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      });
    }
  }

  // ---------------------------------------------
  // 2b. COIN DROP TRANSITION
  // Catches the click first (capture phase), plays the animation,
  // then re-sends the click so script.js opens Slide 1 as normal.
  // ---------------------------------------------
  if (!btn) return;

  let passThrough = false;
  const flash = document.createElement("div");
  flash.className = "coin-flash";
  document.body.appendChild(flash);

  function letClickThrough() {
    passThrough = true;
    btn.click();
    passThrough = false;
  }

  window.addEventListener("click", function (e) {
    if (passThrough || !btn.contains(e.target)) return;

    e.stopPropagation();
    e.preventDefault();
    if (launching) return;
    launching = true;

    if (coinLabel) coinLabel.textContent = "1 CREDIT";
    if (credits) {
      credits.textContent = "CREDITS 01";
      credits.classList.add("is-paid");
    }

    if (reduce) {
      letClickThrough();
      launching = false;
      return;
    }

    const leaving = [header, hud, coinWrap].concat(terminals).filter(Boolean);

    gsap.timeline({
      onComplete: function () {
        gsap.set(leaving.concat([magnet]).filter(Boolean), { clearProps: "opacity,transform" });
        if (coinLabel) coinLabel.textContent = "INSERT COIN";
        launching = false;
      }
    })
      // Button press
      .to(magnet, { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.inOut" })
      // Everything fades out, staggered
      .to(leaving, { opacity: 0, duration: 0.3, stagger: 0.04, ease: "power2.in" }, "+=0.25")
      // Flash, swap to Slide 1 at the peak, then fade the flash away
      .to(flash, { opacity: 0.85, duration: 0.12, ease: "power2.in" })
      .add(letClickThrough)
      .to(flash, { opacity: 0, duration: 0.45, ease: "power2.out" });
  }, true);
})();