/*
 * Mermaid Zoom — Obsidian Plugin
 * Author : Sonct
 * Version: 1.0.3
 *
 * No build step required — copy the whole folder to
 * <vault>/.obsidian/plugins/mermaid-zoom/
 */

const { Plugin } = require('obsidian');

const ZOOM_STEP  = 0.2;
const ZOOM_MIN   = 0.2;
const ZOOM_MAX   = 5.0;
const ZOOM_RESET = 1.0;

// Màu nền canvas theo theme
const CANVAS_BG = {
  dark:  '#1a1a2e',   // nền tối như Obsidian dark
  light: '#ffffff',   // nền trắng sạch
};

// Các màu nền "rác" cần bỏ qua khi bake — transparent / vàng nhạt mermaid default
const SKIP_BG = [
  'rgba(0, 0, 0, 0)',
  'transparent',
  'rgb(255, 255, 255)',   // white — để SVG tự quyết
  // mermaid default subgraph fills (vàng nhạt, xanh nhạt...)
  'rgb(255, 255, 222)',
  'rgb(255, 255, 204)',
  'rgb(238, 238, 255)',
  'rgb(204, 238, 255)',
  'rgb(221, 238, 255)',
];

function isBoring(color) {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  if (c === 'none' || c === 'transparent') return true;
  return SKIP_BG.some(s => s === color);
}

module.exports = class MermaidZoomPlugin extends Plugin {

  async onload() {
    console.log('[MermaidZoom] loaded');
    this.registerStyles();

    this.registerEvent(
      this.app.workspace.on('layout-change', () => this.attachButtons())
    );
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => this.attachButtons(), 300);
      })
    );
    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        document.querySelectorAll('.mz-overlay').forEach(o => this._applyTheme(o));
      })
    );

    setTimeout(() => this.attachButtons(), 500);
    this._observer = new MutationObserver(() => this.attachButtons());
    this._observer.observe(document.body, { childList: true, subtree: true });
  }

  onunload() {
    if (this._observer) this._observer.disconnect();
    document.querySelectorAll('.mermaid-zoom-wrapper').forEach(w => {
      const parent  = w.parentNode;
      const mermaid = w.querySelector('.mermaid');
      if (mermaid && parent) { parent.insertBefore(mermaid, w); w.remove(); }
    });
    const style = document.getElementById('mermaid-zoom-styles');
    if (style) style.remove();
  }

  _isDark() {
    return document.body.classList.contains('theme-dark');
  }

  _applyTheme(overlay) {
    const dark = this._isDark();
    overlay.classList.toggle('theme-dark',  dark);
    overlay.classList.toggle('theme-light', !dark);
    // Update canvas bg colour directly so it's instant
    const canvas = overlay.querySelector('.mz-canvas');
    if (canvas) canvas.style.background = dark ? CANVAS_BG.dark : CANVAS_BG.light;
  }

  registerStyles() {
    const styleId = 'mermaid-zoom-styles';
    if (document.getElementById(styleId)) return;
    const link = document.createElement('link');
    link.id   = styleId;
    link.rel  = 'stylesheet';
    link.href = this.app.vault.adapter.getResourcePath(
      this.app.vault.configDir + '/plugins/mermaid-zoom/styles.css'
    );
    document.head.appendChild(link);
  }

  attachButtons() {
    document.querySelectorAll('.mermaid').forEach(el => {
      if (el.closest('.mermaid-zoom-wrapper')) return;
      if (!el.querySelector('svg')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-zoom-wrapper';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      const btn = document.createElement('button');
      btn.className = 'mermaid-zoom-btn';
      btn.title     = 'Mở Mermaid Zoom (hoặc Ctrl+Click)';
      btn.innerHTML = '⤢ Zoom';
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.openPopup(el); });
      wrapper.appendChild(btn);

      el.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.openPopup(el); }
      });
    });
  }

  // ── Clone SVG: chỉ bake stroke/fill/color — KHÔNG bake background ─
  cloneSvgWithColors(svgEl) {
    const clone    = svgEl.cloneNode(true);
    const origEls  = [svgEl,  ...svgEl.querySelectorAll('*')];
    const cloneEls = [clone,  ...clone.querySelectorAll('*')];

    cloneEls.forEach((c, i) => {
      const o = origEls[i];
      if (!o) return;
      try {
        const cs     = getComputedStyle(o);
        const fill   = cs.fill;
        const stroke = cs.stroke;
        const color  = cs.color;
        const fs     = cs.fontSize;

        // Bake stroke/fill/color — these define node colours
        if (fill   && fill   !== 'none') c.style.fill   = fill;
        if (stroke && stroke !== 'none') c.style.stroke = stroke;
        if (color)                       c.style.color  = color;
        if (fs)                          c.style.fontSize = fs;

        // Background: only bake if it's a meaningful, non-default colour
        // Skip transparent, white, and mermaid's default pastel fills
        const bg = cs.backgroundColor;
        if (!isBoring(bg)) {
          c.style.backgroundColor = bg;
        } else {
          // Explicitly clear so inherited/default doesn't leak through
          c.style.backgroundColor = '';
        }
      } catch (_) {}
    });

    // Copy CSS vars from :root + theme classes so var(--...) resolves
    let cssVars = '';
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            const sel = rule.selectorText || '';
            if ([':root','html','.theme-dark','.theme-light'].includes(sel)) {
              cssVars += rule.cssText + '\n';
            }
          });
        } catch (_) {}
      });
    } catch (_) {}

    let inlineCss = '';
    svgEl.querySelectorAll('style').forEach(s => { inlineCss += s.textContent + '\n'; });

    clone.querySelectorAll('style').forEach(s => s.remove());
    if (cssVars || inlineCss) {
      const styleEl = document.createElement('style');
      styleEl.textContent = cssVars + '\n' + inlineCss;
      clone.insertBefore(styleEl, clone.firstChild);
    }

    // Remove any explicit background on the SVG root itself
    clone.style.background    = '';
    clone.style.backgroundColor = '';

    return clone;
  }

  openPopup(mermaidEl) {
    const svgEl = mermaidEl.querySelector('svg');
    if (!svgEl) return;

    const svgClone = this.cloneSvgWithColors(svgEl);

    let scale  = ZOOM_RESET, tx = 0, ty = 0;
    let isDragging = false, startX, startY, startTx, startTy;

    // ── Overlay ──
    const overlay = document.createElement('div');
    overlay.className = 'mz-overlay';
    this._applyTheme(overlay);

    const popup = document.createElement('div');
    popup.className = 'mz-popup';

    // ── Toolbar ──
    const toolbar = document.createElement('div');
    toolbar.className = 'mz-toolbar';

    const makeBtn = (label, title, onClick) => {
      const b = document.createElement('button');
      b.className = 'mz-btn'; b.textContent = label; b.title = title;
      b.addEventListener('click', onClick);
      return b;
    };

    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'mz-zoom-level';
    zoomLabel.textContent = '100%';

    const applyTransform = () => {
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      zoomLabel.textContent = Math.round(scale * 100) + '%';
    };

    const zoomTo = (newScale, cx, cy) => {
      const r = canvas.getBoundingClientRect();
      if (cx === undefined) cx = r.width / 2;
      if (cy === undefined) cy = r.height / 2;
      const prev = scale;
      scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newScale));
      tx = cx - (cx - tx) * (scale / prev);
      ty = cy - (cy - ty) * (scale / prev);
      applyTransform();
    };

    const fitToCanvas = () => {
      const svg = inner.querySelector('svg');
      if (!svg) return;
      const cw = canvas.clientWidth - 40, ch = canvas.clientHeight - 40;
      const sw = svg.viewBox?.baseVal?.width  || svg.clientWidth  || 800;
      const sh = svg.viewBox?.baseVal?.height || svg.clientHeight || 600;
      scale = Math.min(cw / sw, ch / sh, ZOOM_RESET);
      tx = (canvas.clientWidth  - sw * scale) / 2;
      ty = (canvas.clientHeight - sh * scale) / 2;
      applyTransform();
    };

    const divider = () => { const d = document.createElement('div'); d.className = 'mz-divider'; return d; };

    // Theme toggle
    const themeIcon = () => this._isDark() ? '☀️' : '🌙';
    const themeBadge = document.createElement('span');
    themeBadge.className = 'mz-theme-badge';

    const refreshTheme = () => {
      this._applyTheme(overlay);
      themeBadge.textContent   = this._isDark() ? 'Dark' : 'Light';
      btnTheme.textContent     = themeIcon();
    };

    const btnTheme = document.createElement('button');
    btnTheme.className   = 'mz-btn mz-theme-btn';
    btnTheme.textContent = themeIcon();
    btnTheme.title       = 'Chuyển Dark / Light';
    btnTheme.addEventListener('click', () => {
      const dark = this._isDark();
      document.body.classList.toggle('theme-dark',  !dark);
      document.body.classList.toggle('theme-light',  dark);
      refreshTheme();
    });

    refreshTheme();

    const btnClose = makeBtn('✕', 'Đóng (Esc)', () => closePopup());
    btnClose.classList.add('mz-close');

    toolbar.append(
      makeBtn('−', 'Zoom out (−)', () => zoomTo(scale - ZOOM_STEP)),
      zoomLabel,
      makeBtn('+', 'Zoom in (+)',  () => zoomTo(scale + ZOOM_STEP)),
      divider(),
      makeBtn('⟳', 'Reset (0)',    () => { scale = ZOOM_RESET; tx = 0; ty = 0; applyTransform(); }),
      makeBtn('⊡', 'Fit (F)',      () => fitToCanvas()),
      divider(),
      btnTheme, themeBadge,
      btnClose
    );

    // ── Canvas ──
    const canvas = document.createElement('div');
    canvas.className = 'mz-canvas';
    // Set bg immediately from current theme
    canvas.style.background = this._isDark() ? CANVAS_BG.dark : CANVAS_BG.light;

    const inner = document.createElement('div');
    inner.className = 'mz-inner';
    inner.appendChild(svgClone);

    const hint = document.createElement('div');
    hint.className   = 'mz-hint';
    hint.textContent = 'Scroll → zoom  ·  Kéo → di chuyển  ·  Esc → đóng';

    canvas.appendChild(inner);
    canvas.appendChild(hint);
    popup.appendChild(toolbar);
    popup.appendChild(canvas);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    setTimeout(fitToCanvas, 50);

    // ── Wheel ──
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomTo(scale + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    // ── Mouse drag ──
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY; startTx = tx; startTy = ty;
      canvas.classList.add('dragging');
    });
    const onMouseMove = (e) => {
      if (!isDragging) return;
      tx = startTx + (e.clientX - startX); ty = startTy + (e.clientY - startY);
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };
    const onMouseUp = () => { if (!isDragging) return; isDragging = false; canvas.classList.remove('dragging'); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);

    // ── Touch ──
    let lastDist = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) lastDist = getTouchDist(e);
      else if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; startTx = tx; startTy = ty;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e), mid = getTouchMid(e, canvas);
        if (lastDist) zoomTo(scale * (dist / lastDist), mid.x, mid.y);
        lastDist = dist;
      } else if (e.touches.length === 1 && isDragging) {
        tx = startTx + (e.touches[0].clientX - startX); ty = startTy + (e.touches[0].clientY - startY);
        inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDragging = false; lastDist = null; });

    // ── Keyboard ──
    const onKey = (e) => {
      if (e.key === 'Escape')             closePopup();
      if (e.key === '=' || e.key === '+') zoomTo(scale + ZOOM_STEP);
      if (e.key === '-' || e.key === '_') zoomTo(scale - ZOOM_STEP);
      if (e.key === '0')                  { scale = ZOOM_RESET; tx = 0; ty = 0; applyTransform(); }
      if (e.key === 'f' || e.key === 'F') fitToCanvas();
      if (e.key === 't' || e.key === 'T') btnTheme.click();
    };
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });

    function closePopup() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('keydown',   onKey);
      overlay.remove();
    }
  }
};

function getTouchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function getTouchMid(e, el) {
  const rect = el.getBoundingClientRect();
  return {
    x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
    y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top,
  };
}
