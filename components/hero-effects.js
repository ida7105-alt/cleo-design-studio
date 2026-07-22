/**
 * components/hero-effects.js
 * Awwwards-level Hero 動態效果
 *
 * 功能：
 * 1. Preloader 遮罩淡出（等 DOMContentLoaded）
 * 2. Split Text + GSAP stagger 進場動畫
 * 3. Mouse Parallax（LERP 平滑，桌機限定）
 * 4. Magnetic Scroll Button（Scroll Down 圓圈磁吸）
 */

(function () {
  'use strict';

  // ─── Reduced Motion Guard ─────────────────────────────────────────────────
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Utility: LERP ────────────────────────────────────────────────────────
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ─── Utility: isTouchDevice ───────────────────────────────────────────────
  const isTouchDevice = window.matchMedia('(hover: none)').matches;

  // ══════════════════════════════════════════════════════════════════════════
  // 1. PRELOADER
  //    遮罩淡出：DOM ready 後延遲一幀，讓瀏覽器完成佈局再播動畫
  // ══════════════════════════════════════════════════════════════════════════
  function initPreloader() {
    const preloader = document.getElementById('hero-preloader');
    if (!preloader) return;

    // 確保 body 不滾動，直到 preloader 消失
    document.body.classList.add('preloader-active');

    function dismissPreloader() {
      preloader.classList.add('is-leaving');

      preloader.addEventListener(
        'transitionend',
        () => {
          preloader.style.display = 'none';
          document.body.classList.remove('preloader-active');
        },
        { once: true }
      );
    }

    // 等 window.load（圖片/字型都好）再消失，最少顯示 400ms 避免閃爍
    const minDisplayMs = 400;
    const startTime = Date.now();

    window.addEventListener('load', () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayMs - elapsed);
      setTimeout(dismissPreloader, remaining);
    });

    // Fallback：如果 window.load 沒觸發（offline / cache），3s 後強制消失
    setTimeout(dismissPreloader, 3000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. SPLIT TEXT + GSAP STAGGER ENTRANCE
  //    把 h1 拆成逐行 span，讓 GSAP 錯開播放
  // ══════════════════════════════════════════════════════════════════════════
  function splitHeroH1() {
    const h1 = document.querySelector('#hero-section h1');
    if (!h1) return [];

    // 取出 innerHTML，用 <br> 系列 tag 分行
    const rawHtml = h1.innerHTML;
    const lineStrings = rawHtml
      .split(/<br\s*\/?>/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (lineStrings.length < 2) return [h1]; // 單行 fallback

    // 重建：每行用獨立 span 包住，讓 GSAP 分段 fade-up（不用 overflow:hidden）
    h1.innerHTML = lineStrings
      .map(
        (line) =>
          `<span class="hero-split-inner" style="display:block;">${line}</span>`
      )
      .join('');

    return Array.from(h1.querySelectorAll('.hero-split-inner'));
  }

  function initEntranceAnimation(lineEls) {
    if (prefersReducedMotion) {
      // 直接顯示，不動畫
      document.querySelector('#hero-section .hero-fade-group')?.classList.add('is-ready');
      return;
    }

    // 等 GSAP 載入（非同步 CDN）
    if (typeof gsap === 'undefined') {
      console.warn('[hero-effects] GSAP not loaded, skipping entrance animation.');
      return;
    }

    const heroGroup = document.querySelector('#hero-section .hero-fade-group');
    const subtitle  = document.querySelector('#hero-section .hero-subtitle');
    const sideTexts = document.querySelectorAll('#hero-section .hero-side-text');
    const scrollBtn = document.querySelector('#hero-section .hero-scroll-btn');

    // 讓整個 hero 先可見（覆蓋 .fade-up 的 opacity:0 狀態）
    if (heroGroup) {
      gsap.set(heroGroup, { opacity: 1, y: 0, clearProps: 'transform,opacity' });
    }

    const tl = gsap.timeline({
      // Preloader 消失後（~400ms + 一點緩衝）才開始
      delay: 0.55,
      defaults: { ease: 'power3.out' },
    });

    // h1 逐行 fade-up（由下往上，無裁切）
    if (lineEls.length) {
      tl.from(lineEls, {
        y: 50,
        opacity: 0,
        duration: 1.1,
        stagger: 0.18,
        ease: 'power3.out',
      });
    }

    // 副標文字
    if (subtitle) {
      tl.from(
        subtitle,
        { y: 30, opacity: 0, duration: 0.9 },
        '-=0.65' // 與前一個動畫重疊
      );
    }

    // 側邊裝飾文字
    if (sideTexts.length) {
      tl.from(
        sideTexts,
        { opacity: 0, x: (i) => (i === 0 ? -20 : 20), duration: 0.7, stagger: 0.08 },
        '-=0.5'
      );
    }

    // Scroll Down 按鈕
    if (scrollBtn) {
      tl.from(
        scrollBtn,
        { opacity: 0, scale: 0.75, duration: 0.6, ease: 'back.out(1.7)' },
        '-=0.3'
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MOUSE PARALLAX (LERP)
  //    三層：文字中心輕微 3D 傾斜 / rain canvas 反向位移 / 側邊文字橫移
  // ══════════════════════════════════════════════════════════════════════════
  function initMouseParallax() {
    if (isTouchDevice || prefersReducedMotion) return;

    const hero       = document.getElementById('hero-section');
    const textLayer  = hero?.querySelector('.w-full.relative.z-10');
    const rainCanvas = document.getElementById('rain-canvas');
    const sideTexts  = hero?.querySelectorAll('.hero-side-text');

    if (!hero || !textLayer) return;

    // 加 perspective 讓 rotate3d 有深度感
    hero.style.perspective = '800px';
    textLayer.style.willChange = 'transform';
    textLayer.style.transformStyle = 'preserve-3d';

    let targetX = 0, targetY = 0;
    let currX = 0, currY = 0;
    let rafId = null;
    let active = false;

    function onMouseMove(e) {
      const rect = hero.getBoundingClientRect();
      // 映射到 -1 ~ 1
      targetX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      targetY = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    }

    function onMouseLeave() {
      targetX = 0;
      targetY = 0;
    }

    function tick() {
      currX = lerp(currX, targetX, 0.09);
      currY = lerp(currY, targetY, 0.09);

      // 文字層：3D 傾斜 ±5°（更明顯的波動感）
      textLayer.style.transform =
        `rotateY(${currX * 5}deg) rotateX(${-currY * 5}deg)`;

      // Rain canvas：反向位移 ±20px / ±12px（加強視差）
      if (rainCanvas) {
        rainCanvas.style.transform =
          `translate(${-currX * 20}px, ${-currY * 12}px)`;
      }

      // 側邊裝飾文字：水平大幅位移 ±35px
      if (sideTexts && sideTexts.length) {
        sideTexts.forEach((el, i) => {
          const dir = i === 0 ? -1 : 1;
          el.style.transform = `translateX(${dir * currX * 35}px)`;
        });
      }

      rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (!active) {
        active = true;
        rafId = requestAnimationFrame(tick);
      }
    }

    function stopLoop() {
      active = false;
      cancelAnimationFrame(rafId);
    }

    hero.addEventListener('mouseenter', startLoop);
    hero.addEventListener('mousemove',  onMouseMove);
    hero.addEventListener('mouseleave', () => { onMouseLeave(); stopLoop(); });

    // 可見性變化：隱藏分頁時暫停
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      // 回來不自動重啟，等 mousemove 觸發即可
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. MAGNETIC SCROLL BUTTON
  //    滑鼠在 90px 半徑內時，按鈕朝游標磁吸偏移
  // ══════════════════════════════════════════════════════════════════════════
  function initMagneticButton() {
    if (isTouchDevice || prefersReducedMotion) return;

    const btn = document.querySelector('#hero-section .hero-scroll-btn');
    if (!btn) return;

    const RADIUS   = 90;  // px，觸發磁吸的距離
    const STRENGTH = 0.38; // 磁吸強度倍率

    let btnX = 0, btnY = 0;
    let currOffX = 0, currOffY = 0;
    let targetOffX = 0, targetOffY = 0;
    let rafId = null;

    function updateBtnCenter() {
      const rect = btn.getBoundingClientRect();
      btnX = rect.left + rect.width  / 2;
      btnY = rect.top  + rect.height / 2;
    }

    function onMouseMove(e) {
      updateBtnCenter();
      const dx   = e.clientX - btnX;
      const dy   = e.clientY - btnY;
      const dist = Math.hypot(dx, dy);

      if (dist < RADIUS) {
        const pull = (RADIUS - dist) / RADIUS;
        targetOffX = dx * pull * STRENGTH;
        targetOffY = dy * pull * STRENGTH;
      } else {
        targetOffX = 0;
        targetOffY = 0;
      }
    }

    function tick() {
      currOffX = lerp(currOffX, targetOffX, 0.10);
      currOffY = lerp(currOffY, targetOffY, 0.10);

      // 只有偏移量夠小才停止（避免永遠跑 RAF）
      const isSettled =
        Math.abs(currOffX - targetOffX) < 0.05 &&
        Math.abs(currOffY - targetOffY) < 0.05 &&
        targetOffX === 0 && targetOffY === 0;

      btn.style.transform = `translate(${currOffX}px, ${currOffY}px)`;

      if (!isSettled) {
        rafId = requestAnimationFrame(tick);
      } else {
        btn.style.transform = '';
        rafId = null;
      }
    }

    document.addEventListener('mousemove', (e) => {
      onMouseMove(e);
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    });

    window.addEventListener('resize', updateBtnCenter);
    window.addEventListener('scroll', updateBtnCenter, { passive: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. ABOUT CARD — 3D Tilt
  //    滑鼠在深色個人介紹卡片上移動時，卡片做立體傾斜（±15°）
  // ══════════════════════════════════════════════════════════════════════════
  function initAboutCardCursor() {
    if (isTouchDevice || prefersReducedMotion) return;

    const card = document.getElementById('about-card');
    if (!card) return;

    // 縮短 perspective 讓傾斜視覺更強烈
    card.style.perspective    = '700px';
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange     = 'transform, box-shadow';
    // transform + box-shadow 都要 transition
    card.style.transition =
      'transform 0.35s cubic-bezier(0.23,1,0.32,1), box-shadow 0.35s cubic-bezier(0.23,1,0.32,1)';

    // shadow-xl 原本的外陰影（保留，不被 JS 蓋掉）
    const BASE_SHADOW = '0 25px 50px -12px rgba(0,0,0,0.4)';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2; // -1 ~ 1
      const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;

      // 3D Tilt ±15°
      card.style.transform = `rotateY(${nx * 15}deg) rotateX(${-ny * 15}deg)`;

      // Inner Shadow Depth：
      // 滑鼠在右(nx>0) → 卡片右側面向觀者，左側背光 → 左側內陰影 (inset 正x)
      // 滑鼠在下(ny>0) → 頂部面向觀者，底部背光 → 頂部內陰影 (inset 正y)
      const sx = nx * 32;  // 陰影水平偏移量
      const sy = ny * 22;  // 陰影垂直偏移量
      const intensity = Math.sqrt(nx * nx + ny * ny); // 0~1.41，傾斜越大陰影越深
      const alpha = Math.min(0.55, intensity * 0.4);

      card.style.boxShadow =
        `${BASE_SHADOW}, inset ${sx}px ${sy}px 55px rgba(0,0,0,${alpha.toFixed(2)})`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform  = 'rotateY(0deg) rotateX(0deg)';
      card.style.boxShadow  = BASE_SHADOW;
    });
  }


  // ══════════════════════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════════════════════
  function init() {
    initPreloader();

    // Split text 在 DOMContentLoaded 就能執行（不需等 GSAP）
    const lineEls = splitHeroH1();

    // GSAP 動畫等 preloader 開始淡出後才啟動
    // GSAP 本身由 CDN 同步載入（放在 </head> 前），DOM ready 時已可用
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initEntranceAnimation(lineEls));
    } else {
      initEntranceAnimation(lineEls);
    }

    // initMouseParallax() 已停用：文字與雨背景不隨滑鼠移動
    initMagneticButton();

    // initAboutCardCursor() 已停用：3D tilt 取消
  }

  // 立即執行（script defer 保證 DOM 已 ready）
  init();
})();
