/**
 * Cinematic Smooth Scroll Canvas Animation Engine
 * Features:
 * - 192 frames sequential playback linked to scroll progress (0-indexed)
 * - High-DPI Retina canvas scaling with smart object-fit: cover
 * - Smooth momentum lerping (Linear Interpolation) with 60/120fps requestAnimationFrame
 * - Concurrent progressive frame preloader with graceful nearest-frame fallback
 * - Zero flickering, zero blank frames
 */

(function () {
  'use strict';

  // Configuration — 192 frames, 0-indexed: frame_000000.png … frame_000191.png
  const TOTAL_FRAMES = 192;
  const LERP_FACTOR = 0.085; // Butter-smooth easing factor
  const INITIAL_BATCH_THRESHOLD = 20; // Unlock interactive view after first 20 frames
  const getFramePath = (idx) =>
    `frames_extracted/frame_${String(idx).padStart(6, '0')}.png`;

  // DOM Elements
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loaderOverlay = document.getElementById('loader');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderFill = document.getElementById('loader-fill');

  // State
  const images = new Array(TOTAL_FRAMES);
  const loadedMap = new Uint8Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let isReady = false;

  let currentFrame = 0;   // float, 0-based
  let targetFrame = 0;    // float, 0-based
  let lastRenderedFrame = -1;

  // High-quality canvas rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  /* -----------------------------------------------------------------------
     Resize canvas — honours Device Pixel Ratio for retina crispness
  ----------------------------------------------------------------------- */
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    if (lastRenderedFrame >= 0) {
      renderFrame(lastRenderedFrame);
    }
  }

  /* -----------------------------------------------------------------------
     Guard: only use images that have actually finished decoding
  ----------------------------------------------------------------------- */
  function isImageUsable(img) {
    return img && img.complete && img.naturalWidth > 0;
  }

  /* -----------------------------------------------------------------------
     Find nearest loaded frame to prevent blank flashes during rapid scrub
  ----------------------------------------------------------------------- */
  function getBestAvailableFrame(index) {
    if (isImageUsable(images[index])) return images[index];

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = index - offset;
      if (prev >= 0 && isImageUsable(images[prev])) return images[prev];
      const next = index + offset;
      if (next < TOTAL_FRAMES && isImageUsable(images[next])) return images[next];
    }
    return null;
  }

  /* -----------------------------------------------------------------------
     Render a frame with object-fit: cover scaling (centered, full-bleed)
  ----------------------------------------------------------------------- */
  function renderFrame(index) {
    const img = getBestAvailableFrame(index);
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth  || 1080;
    const ih = img.naturalHeight || 1920;

    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) * 0.5;
    const drawY = (ch - drawH) * 0.5;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  /* -----------------------------------------------------------------------
     Scroll handler — maps scroll progress → target frame index
  ----------------------------------------------------------------------- */
  function updateScrollTarget() {
    const scrollY   = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress  = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;

    targetFrame = progress * (TOTAL_FRAMES - 1);
  }

  /* -----------------------------------------------------------------------
     Main animation loop — lerp + render on change
  ----------------------------------------------------------------------- */
  function animationLoop() {
    const diff = targetFrame - currentFrame;

    if (Math.abs(diff) > 0.0005) {
      currentFrame += diff * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    const frameIdx = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);

    if (frameIdx !== lastRenderedFrame) {
      renderFrame(frameIdx);
      lastRenderedFrame = frameIdx;
    }

    requestAnimationFrame(animationLoop);
  }

  /* -----------------------------------------------------------------------
     Loader progress callback
  ----------------------------------------------------------------------- */
  function onImageLoaded(index) {
    loadedCount++;
    loadedMap[index] = 1;

    const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (loaderPercent) loaderPercent.textContent = `${percent}%`;
    if (loaderFill)    loaderFill.style.width    = `${percent}%`;

    // Render very first frame as soon as it arrives
    if (index === 0 && lastRenderedFrame === -1) {
      renderFrame(0);
      lastRenderedFrame = 0;
    }

    // Dismiss preloader once the first batch of frames are ready
    if (!isReady && (loadedCount >= INITIAL_BATCH_THRESHOLD || loadedCount === TOTAL_FRAMES)) {
      isReady = true;
      if (loaderOverlay) loaderOverlay.classList.add('fade-out');
    }
  }

  /* -----------------------------------------------------------------------
     Preload a single frame by index
  ----------------------------------------------------------------------- */
  function preloadImage(index) {
    const img = new Image();
    img.src    = getFramePath(index);
    img.onload  = () => onImageLoaded(index);
    img.onerror = () => {
      console.warn(`Failed to load frame ${index}`);
      onImageLoaded(index); // keep counter moving so loader doesn't stall
    };
    images[index] = img;
  }

  /* -----------------------------------------------------------------------
     Concurrent batch preloader
     Strategy: frame 0 first → sparse keyframes → fill every remaining frame
  ----------------------------------------------------------------------- */
  function startPreloading() {
    // 1. Frame 0 immediately (show something ASAP)
    preloadImage(0);

    // 2. Keyframes every 8 frames for fast scrubbing even before full load
    const step = 8;
    for (let i = 1; i < TOTAL_FRAMES; i += step) {
      preloadImage(i);
    }

    // 3. All remaining frames
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      if ((i % step) !== 1) {
        preloadImage(i);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Smooth anchor scroll for nav links
  // -------------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', updateScrollTarget, { passive: true });
  window.addEventListener('touchmove', updateScrollTarget, { passive: true });

  resizeCanvas();
  updateScrollTarget();
  startPreloading();
  requestAnimationFrame(animationLoop);

})();
