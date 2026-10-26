// slide1.js - GSAP-style per-text animations and 3D tilt + glare for Slide 1.
// No GSAP plugins needed: text is split into words/chars by hand below.

(function () {
  const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#01";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let tl = null;
  let resetCard = null;
  let parallaxReady = false;

  function getRoot() {
    return document.querySelector(".slide.s1");
  }

// ---------------------------------------------
  // SPLIT TEXT
  // ---------------------------------------------
  function splitText(el, withChars) {
    if (!el || el.dataset.split === "1") return;
    el.dataset.split = "1";

    function makeWord(text, className = "s1-word") {
      const mask = document.createElement("span");
      mask.className = "s1-mask";
      const inner = document.createElement("span");
      inner.className = className;

      if (withChars) {
        for (const ch of text) {
          const c = document.createElement("span");
          c.className = "s1-char";
          c.textContent = ch;
          inner.appendChild(c);
        }
      } else {
        inner.textContent = text;
      }

      mask.appendChild(inner);
      return mask;
    }

    function walk(node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const part of parts) {
            if (part === "") continue;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
            } else {
              frag.appendChild(makeWord(part, "s1-word"));
            }
          }
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.matches("a")) {
          if (child.classList.contains("s1-hl")) {
            // Treat the entire highlight element as one unified block instead of splitting its words
            const wrapper = document.createElement("span");
            wrapper.className = "s1-mask";
            
            const inner = document.createElement("span");
            inner.className = "s1-word s1-hl";
            if (child.dataset.sprite) inner.dataset.sprite = child.dataset.sprite;
            inner.innerHTML = child.innerHTML;
            
            wrapper.appendChild(inner);
            node.replaceChild(wrapper, child);
          } else {
            walk(child);
          }
        }
      }
    }

    walk(el);
  }

  // ---------------------------------------------
  // HELPER TWEENS
  // ---------------------------------------------
  function scrambleTween(el, duration) {
    const finalText = el.dataset.scramble || el.textContent;
    const state = { p: 0 };

    return gsap.to(state, {
      p: 1,
      duration: duration,
      ease: "none",
      onUpdate: function () {
        const revealed = Math.floor(state.p * finalText.length);
        let out = finalText.slice(0, revealed);
        for (let i = revealed; i < finalText.length; i++) {
          out += finalText[i] === " "
            ? " "
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        el.textContent = out;
      },
      onComplete: function () {
        el.textContent = finalText;
      }
    });
  }

  function counterTween(el) {
    const to = parseFloat(el.dataset.count);
    const from = parseFloat(el.dataset.from || "0");
    const state = { v: from };
    el.textContent = String(Math.round(from));

    return gsap.to(state, {
      v: to,
      duration: 1.4,
      ease: "power3.out",
      onUpdate: function () {
        el.textContent = String(Math.round(state.v));
      }
    });
  }

  // ---------------------------------------------
  // 3D MAGNETIC TILT + PARALLAX + GLARE
  // ---------------------------------------------
  function setupParallax(root) {
    if (parallaxReady || reduceMotion.matches) return;

    const card = root.querySelector(".s1-figure");
    const img = root.querySelector(".s1-img");
    const sheen = root.querySelector(".s1-glare-sheen");
    if (!card || !img) return;
    parallaxReady = true;

    const MAX_TILT = 8;     // degrees
    const IMG_SHIFT_X = 14; // px, opposite direction for depth
    const IMG_SHIFT_Y = 10;

    gsap.set(card, { transformPerspective: 900, transformOrigin: "50% 50%" });

    const ease = { duration: 0.6, ease: "power3.out" };
    const tiltX = gsap.quickTo(card, "rotationX", ease);
    const tiltY = gsap.quickTo(card, "rotationY", ease);
    const imgX = gsap.quickTo(img, "x", { duration: 0.8, ease: "power3.out" });
    const imgY = gsap.quickTo(img, "y", { duration: 0.8, ease: "power3.out" });

    let glareX, glareY, glareO;
    if (sheen) {
      glareX = gsap.quickTo(sheen, "xPercent", { duration: 0.5, ease: "power3.out" });
      glareY = gsap.quickTo(sheen, "yPercent", { duration: 0.5, ease: "power3.out" });
      glareO = gsap.quickTo(sheen, "opacity", { duration: 0.4, ease: "power2.out" });
    }

    let rect = card.getBoundingClientRect();
    function measure() { rect = card.getBoundingClientRect(); }
    root.addEventListener("mouseenter", measure);
    window.addEventListener("resize", measure);

    root.addEventListener("mousemove", function (e) {
      if (!root.classList.contains("active")) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rawX = (e.clientX - cx) / (rect.width / 2);
      const rawY = (e.clientY - cy) / (rect.height / 2);
      const normX = gsap.utils.clamp(-1, 1, rawX);
      const normY = gsap.utils.clamp(-1, 1, rawY);

      tiltY(normX * MAX_TILT);
      tiltX(-normY * MAX_TILT);
      imgX(-normX * IMG_SHIFT_X);
      imgY(-normY * IMG_SHIFT_Y);

      // Glare follows cursor, brighter toward corners, fades when far from card
      if (sheen) {
        const outside = Math.max(0, Math.hypot(rawX, rawY) - Math.SQRT2);
        const proximity = gsap.utils.clamp(0, 1, 1 - outside / 1.5);
        const dist = Math.min(1, Math.hypot(normX, normY) / Math.SQRT2);

        glareX(normX * 25);
        glareY(normY * 25);
        glareO((0.12 + Math.pow(dist, 2) * 0.6) * proximity);
      }
    });

    resetCard = function () {
      tiltX(0);
      tiltY(0);
      imgX(0);
      imgY(0);
      if (sheen) {
        glareX(0);
        glareY(0);
        glareO(0);
      }
    };

    root.addEventListener("mouseleave", resetCard);
  }

  // ---------------------------------------------
  // MAIN TIMELINE
  // ---------------------------------------------
  function play() {
    if (typeof gsap === "undefined") return;
    const root = getRoot();
    if (!root) return;

    const q = gsap.utils.selector(root);

    // Split once (safe to call repeatedly)
    splitText(root.querySelector(".s1-title"), true);
    root.querySelectorAll(".s1-para").forEach(function (p) { splitText(p, false); });
    splitText(root.querySelector(".s1-quote-text"), false);

    if (tl) tl.kill();

    // Accessibility: no motion, just show everything
    if (reduceMotion.matches) {
      gsap.set(q(".s1-char, .s1-word"), { clearProps: "all" });
      gsap.set(q(".s1-hl"), { "--hl": 1 });
      return;
    }

    setupParallax(root);

    tl = gsap.timeline({ defaults: { ease: "expo.out" } });

    // 1. Eyebrow tag scramble
    tl.fromTo(q(".s1-eyebrow"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
    tl.add(scrambleTween(q(".s1-eyebrow")[0], 0.7), 0);

    // 2. Headline chars rise out of their masks
    tl.fromTo(q(".s1-title .s1-char"),
      { yPercent: 115, rotate: 8, opacity: 1 },
      { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.022 },
      0.15);

    // 3. Divider line draws, label slides in
    tl.fromTo(q(".s1-rule-line"),
      { scaleX: 0 },
      { scaleX: 1, duration: 1.2, ease: "power3.inOut" },
      0.5);
    tl.fromTo(q(".s1-rule-label"),
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.8 },
      0.8);

    // 4. Photo: clip-path wipe + zoom settle
    tl.fromTo(q(".s1-figure"),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
      0.6);
    tl.fromTo(q(".s1-img-wrap"),
      { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" },
      0.7);
    tl.fromTo(q(".s1-img"),
      { scale: 1.35 },
      { scale: 1, duration: 1.8, ease: "expo.out" },
      0.7);

    // 5. Paragraph 1 words, then highlight sweeps
    const paras = q(".s1-para");
    tl.fromTo(paras[0].querySelectorAll(".s1-word"),
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.012, ease: "power3.out" },
      0.9);
    tl.fromTo(paras[0].querySelectorAll(".s1-hl"),
      { "--hl": 0 },
      { "--hl": 1, duration: 0.6, stagger: 0.18, ease: "power2.inOut" },
      ">-0.3");

    // 6. Quote: bar grows, box fades, words rise
    tl.fromTo(q(".s1-quote"),
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" },
      "-=0.6");
    tl.fromTo(q(".s1-quote-bar"),
      { scaleY: 0 },
      { scaleY: 1, duration: 0.6, ease: "power3.inOut" },
      "<");
    tl.fromTo(q(".s1-quote-text .s1-word"),
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.035, ease: "power3.out" },
      "<0.15");
    tl.fromTo(q(".s1-cite"),
      { opacity: 0 },
      { opacity: 1, duration: 0.5 },
      "-=0.2");

    // 7. Paragraph 2 words + highlights
    tl.fromTo(paras[1].querySelectorAll(".s1-word"),
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.012, ease: "power3.out" },
      "-=0.3");
    tl.fromTo(paras[1].querySelectorAll(".s1-hl"),
      { "--hl": 0 },
      { "--hl": 1, duration: 0.6, stagger: 0.2, ease: "power2.inOut" },
      ">");

    // 8. Stats pop in and count up
    tl.addLabel("stats", "-=0.5");
    tl.fromTo(q(".s1-stats"),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "stats");
    q(".s1-stat-num").forEach(function (el, i) {
      tl.add(counterTween(el), "stats+=" + (i * 0.12));
    });

    // 9. Footer hint, then gentle pulse
    tl.fromTo(q(".s1-footer"),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "stats+=0.4");
    tl.to(q(".s1-footer"),
      { opacity: 0.45, duration: 1, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }

  function stop() {
    if (tl) {
      tl.kill();
      tl = null;
    }
    if (resetCard) resetCard();
  }

  window.Slide1 = { play: play, stop: stop };
})();