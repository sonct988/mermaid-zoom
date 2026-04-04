/*
 * Mermaid Zoom — Obsidian Plugin
 * Author : Sonct
 * Version: 1.0.1
 *
 * Popup luôn dùng nền TRẮNG cố định — hiển thị đúng mọi theme Obsidian.
 * Toolbar màu cứng — không bị kéo theo theme Obsidian.
 */

const { Plugin } = require('obsidian');

const ZOOM_STEP  = 0.2;
const ZOOM_MIN   = 0.2;
const ZOOM_MAX   = 5.0;
const ZOOM_RESET = 1.0;

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

  registerStyles() {
    const styleId = 'mermaid-zoom-styles';
    if (document.getElementById(styleId)) return;
    const link = document.createElement('link');
    link.id  = styleId;
    link.rel = 'stylesheet';
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

  // Clone SVG đơn giản — chỉ bake fill/stroke/color của từng element
  // KHÔNG đổi màu mũi tên, KHÔNG filter — giữ nguyên 100% màu gốc
  // Nền trắng canvas sẽ làm mũi tên tối hiện rõ tự nhiên
  cloneSvg(svgEl) {
    const clone    = svgEl.cloneNode(true);
    const origEls  = [svgEl,  ...svgEl.querySelectorAll('*')];
    const cloneEls = [clone,  ...clone.querySelectorAll('*')];

    cloneEls.forEach((c, i) => {
      const o = origEls[i];
      if (!o) return;
      try {
        const cs = getComputedStyle(o);

        // Bake các thuộc tính visual
        if (cs.fill   && cs.fill   !== 'none') c.style.fill   = cs.fill;
        if (cs.stroke && cs.stroke !== 'none') c.style.stroke = cs.stroke;
        if (cs.color)                          c.style.color  = cs.color;
        if (cs.fontSize)                       c.style.fontSize = cs.fontSize;

        // Bake background nếu có màu thực sự
        const bg = cs.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          c.style.backgroundColor = bg;
        }

        // Xóa background trắng mặc định trên SVG root và các container lớn
        // để canvas trắng bên dưới hiện ra — tránh double-white
        c.style.background = '';
      } catch (_) {}
    });

    // Xóa background SVG root
    clone.style.background      = '';
    clone.style.backgroundColor = '';

    // Copy inline <style> từ SVG gốc (mermaid tự inject)
    let inlineCss = '';
    svgEl.querySelectorAll('style').forEach(s => { inlineCss += s.textContent + '\n'; });
    clone.querySelectorAll('style').forEach(s => s.remove());
    if (inlineCss) {
      const styleEl = document.createElement('style');
      styleEl.textContent = inlineCss;
      clone.insertBefore(styleEl, clone.firstChild);
    }

    return clone;
  }

  openPopup(mermaidEl) {
    const svgEl = mermaidEl.querySelector('svg');
    if (!svgEl) return;

    const svgClone = this.cloneSvg(svgEl);

    let scale = ZOOM_RESET, tx = 0, ty = 0;
    let isDragging = false, startX, startY, startTx, startTy;

    // ── Overlay ──
    const overlay = document.createElement('div');
    overlay.className = 'mz-overlay';

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
    zoomLabel.className   = 'mz-zoom-level';
    zoomLabel.textContent = '100%';

    const applyTransform = () => {
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      zoomLabel.textContent = Math.round(scale * 100) + '%';
    };

    const zoomTo = (newScale, cx, cy) => {
      const r = canvas.getBoundingClientRect();
      if (cx === undefined) cx = r.width  / 2;
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
      const cw = canvas.clientWidth  - 40;
      const ch = canvas.clientHeight - 40;
      const sw = svg.viewBox?.baseVal?.width  || svg.clientWidth  || 800;
      const sh = svg.viewBox?.baseVal?.height || svg.clientHeight || 600;
      scale = Math.min(cw / sw, ch / sh, ZOOM_RESET);
      tx = (canvas.clientWidth  - sw * scale) / 2;
      ty = (canvas.clientHeight - sh * scale) / 2;
      applyTransform();
    };

    const divider = () => {
      const d = document.createElement('div');
      d.className = 'mz-divider';
      return d;
    };

    const btnClose = makeBtn('✕', 'Đóng (Esc)', () => closePopup());
    btnClose.classList.add('mz-close');

    toolbar.append(
      makeBtn('−', 'Zoom out (−)', () => zoomTo(scale - ZOOM_STEP)),
      zoomLabel,
      makeBtn('+', 'Zoom in (+)',  () => zoomTo(scale + ZOOM_STEP)),
      divider(),
      makeBtn('⟳', 'Reset (0)',    () => { scale = ZOOM_RESET; tx = 0; ty = 0; applyTransform(); }),
      makeBtn('⊡', 'Fit (F)',      () => fitToCanvas()),
      btnClose
    );

    // ── Canvas ──
    const canvas = document.createElement('div');
    canvas.className = 'mz-canvas';

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

    // ── Wheel zoom ──
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomTo(scale + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP),
             e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    // ── Mouse drag ──
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      startTx = tx; startTy = ty;
      canvas.classList.add('dragging');
    });
    const onMouseMove = (e) => {
      if (!isDragging) return;
      tx = startTx + (e.clientX - startX);
      ty = startTy + (e.clientY - startY);
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };
    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      canvas.classList.remove('dragging');
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);

    // ── Touch ──
    let lastDist = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) lastDist = getTouchDist(e);
      else if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startTx = tx; startTy = ty;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e), mid = getTouchMid(e, canvas);
        if (lastDist) zoomTo(scale * (dist / lastDist), mid.x, mid.y);
        lastDist = dist;
      } else if (e.touches.length === 1 && isDragging) {
        tx = startTx + (e.touches[0].clientX - startX);
        ty = startTy + (e.touches[0].clientY - startY);
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
