/**
 * components/index.js
 * 可重用 Web Components — 只做結構抽象，不改視覺不改排版
 */

// ─── <cleo-navbar> ──────────────────────────────────────────────────────────
class CleoNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = /* html */ `
      <nav class="fixed w-full top-0 z-50 p-6">
        <div class="max-w-6xl mx-auto glass-panel rounded-full px-8 py-4 flex justify-between items-center">
          <a href="#" class="block">
            <img src="./img/Cleo-logo.svg" alt="Cleo Logo" class="h-[57px] w-auto">
          </a>
          <div class="flex items-center gap-8">
            <a href="#works" class="text-sm font-medium hover:text-earth-sage transition-colors">Works</a>
            <a href="javascript:void(0)" id="nav-contact-btn" class="text-sm font-medium hover:text-earth-sage transition-colors">Contact</a>
          </div>
        </div>
      </nav>
    `;
  }
}
customElements.define('cleo-navbar', CleoNavbar);

// ─── <cleo-section-header> ───────────────────────────────────────────────────
// Attrs: label, title, body, align="left|center" (預設 left)
class CleoSectionHeader extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute('label') || '';
    const title = this.getAttribute('title') || '';
    const align = this.getAttribute('align') || 'left';
    const delay = this.getAttribute('delay') || '';

    const alignClass  = align === 'center' ? 'text-center' : '';
    const delayClass  = delay ? ` ${delay}` : '';
    const bodyMaxW    = align === 'center' ? '' : 'max-w-xl';
    const mbClass     = align === 'center' ? 'mb-14 md:mb-20' : 'mb-11 md:mb-16';

    // 取出原本的 slot body 內容（子節點），之後回填
    const slotEl = this.querySelector('[slot="body"]');
    const bodyHTML = slotEl ? slotEl.innerHTML : '';

    this.innerHTML = /* html */ `
      <div class="${alignClass} ${mbClass} fade-up${delayClass}">
        <span class="text-label">${label}</span>
        <h2 class="text-title">${title}</h2>
        ${bodyHTML ? `<p class="mt-6 text-body ${bodyMaxW}">${bodyHTML}</p>` : ''}
      </div>
    `;
  }
}
customElements.define('cleo-section-header', CleoSectionHeader);

// ─── <cleo-project-card> ─────────────────────────────────────────────────────
// Attrs: href, img, alt, title, subtitle, delay
class CleoProjectCard extends HTMLElement {
  connectedCallback() {
    const href     = this.getAttribute('href')     || '#';
    const img      = this.getAttribute('img')      || '';
    const alt      = this.getAttribute('alt')      || '';
    const title    = this.getAttribute('title')    || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const delay    = this.getAttribute('delay')    || '';

    const delayClass = delay ? ` ${delay}` : '';

    this.innerHTML = /* html */ `
      <a href="${href}" class="lightbox-trigger card-glass fade-up${delayClass} group">
        <div class="w-full h-3/4 rounded-2xl overflow-hidden relative">
          <img src="${img}" alt="${alt}"
            class="w-full h-full object-cover object-center rounded-2xl transition-all duration-500 ease-out grayscale group-hover:grayscale-0 group-hover:scale-[1.1]" />
        </div>
        <div>
          <h3 class="text-xl font-medium mt-6 mb-2 group-hover:text-earth-sage transition-colors">
            ${title}</h3>
          <p class="text-earth-muted text-sm font-light">${subtitle}</p>
        </div>
      </a>
    `;
  }
}
customElements.define('cleo-project-card', CleoProjectCard);

// ─── <cleo-banner-thumb> ─────────────────────────────────────────────────────
// Attrs: href, img, alt
class CleoBannerThumb extends HTMLElement {
  connectedCallback() {
    const href = this.getAttribute('href') || '#';
    const img  = this.getAttribute('img')  || '';
    const alt  = this.getAttribute('alt')  || '';

    this.innerHTML = /* html */ `
      <a href="${href}"
        class="lightbox-trigger overflow-hidden rounded-xl md:rounded-2xl aspect-[4/3] border border-earth-dark/5 relative group cursor-pointer hover:border-earth-sage/30 transition-all duration-300 block">
        <img src="${img}" alt="${alt}"
          class="w-full h-full object-cover object-center transition-all duration-500 ease-out grayscale group-hover:grayscale-0 group-hover:scale-[1.05]" />
      </a>
    `;
  }
}
customElements.define('cleo-banner-thumb', CleoBannerThumb);

// ─── <cleo-impact-card> ──────────────────────────────────────────────────────
// Attrs: icon, title, body, delay
class CleoImpactCard extends HTMLElement {
  connectedCallback() {
    const icon  = this.getAttribute('icon')  || '';
    const title = this.getAttribute('title') || '';
    const body  = this.getAttribute('body')  || '';
    const delay = this.getAttribute('delay') || '';

    const delayClass = delay ? ` ${delay}` : '';

    this.innerHTML = /* html */ `
      <div class="fade-up${delayClass}">
        <div class="card-interactive">
          <img src="${icon}" alt="${title}"
            class="w-[35px] h-[35px] mb-[12px] transition-all duration-300 group-hover:scale-110">
          <h4 class="text-lg font-medium mb-3">${title}</h4>
          <p class="text-earth-muted text-sm font-light leading-relaxed">${body}</p>
        </div>
      </div>
    `;
  }
}
customElements.define('cleo-impact-card', CleoImpactCard);

// ─── <cleo-work-step> ────────────────────────────────────────────────────────
// Attrs: step, title, body, delay, variant="final" (最後一步用 sage 色)
class CleoWorkStep extends HTMLElement {
  connectedCallback() {
    const step    = this.getAttribute('step')    || '';
    const title   = this.getAttribute('title')   || '';
    const body    = this.getAttribute('body')    || '';
    const delay   = this.getAttribute('delay')   || '';
    const variant = this.getAttribute('variant') || '';

    const delayClass = delay ? ` ${delay}` : '';
    const isFinal = variant === 'final';

    const numClasses = isFinal
      ? 'w-12 h-12 bg-earth-sage text-white rounded-full flex items-center justify-center mx-auto mb-6 font-medium shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110'
      : 'w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-earth-sage font-medium shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-hover:bg-earth-sage group-hover:text-white';

    const titleClasses = isFinal
      ? 'text-lg font-medium mb-3 text-earth-sage'
      : 'text-lg font-medium mb-3';

    this.innerHTML = /* html */ `
      <div class="fade-up${delayClass} flex-1">
        <div class="glass-panel rounded-[2rem] p-8 text-center h-full group cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(42,37,34,0.1)] hover:bg-white/60">
          <div class="${numClasses}">${step}</div>
          <div class="transition-all duration-300 ease-out group-hover:-translate-y-1">
            <h4 class="${titleClasses}">${title}</h4>
            <p class="text-earth-muted text-sm font-light leading-relaxed">${body}</p>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('cleo-work-step', CleoWorkStep);

// ─── <cleo-step-arrow> ───────────────────────────────────────────────────────
class CleoStepArrow extends HTMLElement {
  connectedCallback() {
    // 讓 host element 本身作為 flex item 垂直置中
    this.style.display = 'none';
    this.style.alignSelf = 'center';
    this.style.flexShrink = '0';

    // md 以上才顯示
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = (e) => { this.style.display = e.matches ? 'flex' : 'none'; };
    apply(mq);
    mq.addEventListener('change', apply);

    this.innerHTML = /* html */ `
      <div style="display:flex;align-items:center;justify-content:center;padding:0 4px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg" class="text-earth-sage opacity-50">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    `;
  }
}
customElements.define('cleo-step-arrow', CleoStepArrow);
