/**
 * Cartoon Character Controller & SVG Renderer
 * Handles characters (Pip the Python & Byte the Robot), animations, speech bubbles, and pointers.
 */

export class CharacterController {
  constructor(containerEl, speechEl, badgeEl) {
    this.containerEl = containerEl;
    this.speechEl = speechEl;
    this.badgeEl = badgeEl;
    this.currentCharacter = 'pip'; // 'pip' or 'byte'
    this.currentPose = 'idle';
    this.x = 20;
    this.y = 80;
    this.customX = null;
    this.customY = null;
    this.hasCustomPosition = false;
    this.isDragging = false;
    this.init();
    this.enableDragging();
  }

  init() {
    this.render();
  }

  enableDragging() {
    let startPointerX = 0;
    let startPointerY = 0;
    let startCharX = 0;
    let startCharY = 0;

    this.containerEl.setAttribute('title', 'Потяните, чтобы переместить • Двойной клик — вернуть на место');

    this.containerEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.isDragging = true;
      this.containerEl.setPointerCapture(e.pointerId);

      startPointerX = e.clientX;
      startPointerY = e.clientY;
      startCharX = this.x;
      startCharY = this.y;

      this.containerEl.classList.add('is-dragging');
      this.setPose('walk');
    });

    this.containerEl.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;

      const parentEl = this.containerEl.parentElement;
      const parentRect = parentEl.getBoundingClientRect();

      const maxX = Math.max(0, parentRect.width - 90);
      const maxY = Math.max(0, parentRect.height - 90);

      const newX = Math.max(0, Math.min(maxX, startCharX + dx));
      const newY = Math.max(0, Math.min(maxY, startCharY + dy));

      this.x = newX;
      this.y = newY;
      this.customX = newX;
      this.customY = newY;
      this.hasCustomPosition = true;

      this.containerEl.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    });

    const finishDrag = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      try {
        this.containerEl.releasePointerCapture(e.pointerId);
      } catch (_) {}
      this.containerEl.classList.remove('is-dragging');
      this.setPose(this.currentPose || 'idle');
    };

    this.containerEl.addEventListener('pointerup', finishDrag);
    this.containerEl.addEventListener('pointercancel', finishDrag);

    // Double-click resets character back to default position
    this.containerEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.resetCustomPosition();
      if (window.pythonApp) {
        window.pythonApp.updateStepView(window.pythonApp.currentStepIdx);
      }
    });
  }

  resetCustomPosition() {
    this.hasCustomPosition = false;
    this.customX = null;
    this.customY = null;
  }

  setCharacter(charName) {
    if (charName === 'pip' || charName === 'byte') {
      this.currentCharacter = charName;
      this.render();
    }
  }

  setPose(pose) {
    this.currentPose = pose;
    const charEl = this.containerEl.querySelector('.character-svg-wrapper');
    if (charEl) {
      charEl.dataset.pose = pose;
    }
  }

  moveTo(targetX, targetY, options = {}) {
    if (this.isDragging) return;

    this.x = targetX;
    this.y = targetY;

    this.containerEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

    if (options.pose) {
      this.setPose(options.pose);
    }
  }

  say(message, pose = 'point') {
    this.setPose(pose);
    if (!this.speechEl) return;

    if (!message) {
      this.speechEl.classList.remove('visible');
      return;
    }

    const charName = this.currentCharacter === 'pip' ? 'Питончик Пип' : 'Робот Байт';
    const charAvatar = this.currentCharacter === 'pip' ? '🐍' : '🤖';

    this.speechEl.innerHTML = `
      <div class="speech-inner">
        <span class="speech-avatar">${charAvatar}</span>
        <div class="speech-content-wrap">
          <span class="speech-author">${charName} (${this.getPoseIcon(pose)})</span>
          <span class="speech-text">${message}</span>
        </div>
      </div>
    `;
    this.speechEl.classList.add('visible');
  }

  showBadge(badgeData, targetRect, containerRect) {
    if (!this.badgeEl || !badgeData) {
      if (this.badgeEl) this.badgeEl.classList.remove('visible');
      return;
    }

    this.badgeEl.innerHTML = `<span class="badge-text">${badgeData.text}</span>`;
    if (targetRect && containerRect) {
      const bx = targetRect.left - containerRect.left + (targetRect.width / 2);
      const by = targetRect.top - containerRect.top - 28;
      this.badgeEl.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
    }
    this.badgeEl.classList.add('visible');
  }

  hideBadge() {
    if (this.badgeEl) {
      this.badgeEl.classList.remove('visible');
    }
  }

  getPoseIcon(pose) {
    switch (pose) {
      case 'walk': return '🐾';
      case 'point': return '👉';
      case 'think': return '🤔';
      case 'calc': return '⚡';
      case 'carry': return '📦';
      case 'celebrate': return '🎉';
      case 'error': return '💥';
      default: return '🐍';
    }
  }

  render() {
    if (this.currentCharacter === 'pip') {
      this.containerEl.innerHTML = this.getPipSVG();
    } else {
      this.containerEl.innerHTML = this.getByteSVG();
    }
    this.setPose(this.currentPose);
  }

  getPipSVG() {
    return `
      <div class="character-svg-wrapper pip-character" data-pose="${this.currentPose}">
        <!-- Pointer Beam / Wand -->
        <div class="pointer-wand">
          <div class="wand-star">✨</div>
          <div class="laser-beam"></div>
        </div>

        <svg viewBox="0 0 160 160" class="character-svg">
          <defs>
            <linearGradient id="pipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4ade80" />
              <stop offset="50%" stop-color="#22c55e" />
              <stop offset="100%" stop-color="#15803d" />
            </linearGradient>
            <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="100%" stop-color="#facc15" />
            </linearGradient>
            <filter id="pipGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(34,197,94,0.35)" />
            </filter>
          </defs>

          <!-- Shadow -->
          <ellipse cx="80" cy="150" rx="45" ry="10" fill="rgba(0,0,0,0.2)" class="char-shadow" />

          <!-- Python Body (curled friendly snake) -->
          <g class="pip-body" filter="url(#pipGlow)">
            <!-- Tail -->
            <path class="pip-tail" d="M 40,135 Q 20,135 15,120 Q 10,105 25,105 Q 35,105 38,120"
                  fill="url(#pipGrad)" stroke="#166534" stroke-width="3" stroke-linecap="round" />

            <!-- Main Coils -->
            <ellipse cx="78" cy="130" rx="46" ry="18" fill="url(#pipGrad)" stroke="#166534" stroke-width="3" />
            <ellipse cx="80" cy="128" rx="35" ry="10" fill="url(#bellyGrad)" />

            <!-- Snake Torso & Neck -->
            <path d="M 60,126 Q 52,90 70,72 Q 88,90 85,126 Z"
                  fill="url(#pipGrad)" stroke="#166534" stroke-width="3" />

            <!-- Snake Head -->
            <ellipse cx="82" cy="62" rx="32" ry="26" fill="url(#pipGrad)" stroke="#166534" stroke-width="3" />
            <!-- Cheeks -->
            <ellipse cx="60" cy="70" rx="6" ry="4" fill="#f87171" opacity="0.6" />
            <ellipse cx="104" cy="70" rx="6" ry="4" fill="#f87171" opacity="0.6" />

            <!-- Smiling Mouth & Tongue -->
            <path class="pip-mouth" d="M 72,74 Q 82,84 92,74" fill="none" stroke="#14532d" stroke-width="3" stroke-linecap="round" />
            <path class="pip-tongue" d="M 82,78 L 82,88 L 78,92 M 82,88 L 86,92" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />

            <!-- Expressive Eyes -->
            <g class="pip-eyes">
              <!-- Left Eye -->
              <ellipse cx="70" cy="56" rx="9" ry="11" fill="#ffffff" stroke="#166534" stroke-width="2" />
              <circle class="pupil-left" cx="72" cy="56" r="5" fill="#1e293b" />
              <circle cx="74" cy="53" r="2" fill="#ffffff" />

              <!-- Right Eye -->
              <ellipse cx="94" cy="56" rx="9" ry="11" fill="#ffffff" stroke="#166534" stroke-width="2" />
              <circle class="pupil-right" cx="92" cy="56" r="5" fill="#1e293b" />
              <circle cx="94" cy="53" r="2" fill="#ffffff" />
            </g>

            <!-- Professor Academic Graduation Cap -->
            <g class="pip-hat">
              <polygon points="82,24 125,36 82,46 39,36" fill="#1e1b4b" stroke="#312e81" stroke-width="2" />
              <ellipse cx="82" cy="40" rx="16" ry="7" fill="#312e81" />
              <!-- Golden Tassel -->
              <line x1="82" y1="35" x2="118" y2="48" stroke="#f59e0b" stroke-width="2" />
              <circle cx="118" cy="49" r="3" fill="#f59e0b" />
            </g>

            <!-- Professor Round Glasses -->
            <g class="pip-glasses">
              <circle cx="70" cy="56" r="11" fill="none" stroke="#d97706" stroke-width="2.5" />
              <circle cx="94" cy="56" r="11" fill="none" stroke="#d97706" stroke-width="2.5" />
              <line x1="81" y1="56" x2="83" y2="56" stroke="#d97706" stroke-width="3" />
            </g>

            <!-- Little Hand holding wand -->
            <g class="pip-hand">
              <ellipse cx="106" cy="98" rx="8" ry="6" fill="url(#pipGrad)" stroke="#166534" stroke-width="2" />
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  getByteSVG() {
    return `
      <div class="character-svg-wrapper byte-character" data-pose="${this.currentPose}">
        <!-- Pointer Beam / Laser -->
        <div class="pointer-wand">
          <div class="wand-star">⚡</div>
          <div class="laser-beam"></div>
        </div>

        <svg viewBox="0 0 160 160" class="character-svg">
          <defs>
            <linearGradient id="robotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </linearGradient>
            <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="100%" stop-color="#1e293b" />
            </linearGradient>
            <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(14,165,233,0.4)" />
            </filter>
          </defs>

          <!-- Shadow -->
          <ellipse cx="80" cy="150" rx="36" ry="8" fill="rgba(0,0,0,0.2)" class="char-shadow" />

          <!-- Floating Propulsion Ring -->
          <ellipse cx="80" cy="136" rx="24" ry="7" fill="#0284c7" stroke="#38bdf8" stroke-width="2" />
          <ellipse cx="80" cy="137" rx="14" ry="4" fill="#38bdf8" class="propulsion-glow" />

          <!-- Main Robot Body -->
          <g class="byte-body" filter="url(#robotGlow)">
            <!-- Torso -->
            <rect x="52" y="86" width="56" height="42" rx="14" fill="url(#robotGrad)" stroke="#075985" stroke-width="2.5" />
            <circle cx="80" cy="107" r="8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2" />

            <!-- Antenna -->
            <line x1="80" y1="40" x2="80" y2="22" stroke="#0284c7" stroke-width="4" stroke-linecap="round" />
            <circle cx="80" cy="20" r="7" fill="#f43f5e" class="antenna-bulb" />

            <!-- Robot Head -->
            <rect x="42" y="38" width="76" height="52" rx="16" fill="url(#robotGrad)" stroke="#075985" stroke-width="2.5" />

            <!-- Face Screen -->
            <rect x="50" y="46" width="60" height="36" rx="10" fill="url(#screenGrad)" stroke="#38bdf8" stroke-width="2" />

            <!-- Glowing Digital Eyes on Screen -->
            <g class="screen-face">
              <!-- Left Eye -->
              <ellipse cx="64" cy="62" rx="6" ry="6" fill="#38bdf8" class="digital-eye" />
              <!-- Right Eye -->
              <ellipse cx="96" cy="62" rx="6" ry="6" fill="#38bdf8" class="digital-eye" />
              <!-- Mouth -->
              <path d="M 74,72 Q 80,76 86,72" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
            </g>

            <!-- Manipulator Hands -->
            <g class="robot-hands">
              <ellipse cx="36" cy="100" rx="7" ry="9" fill="#0284c7" stroke="#075985" stroke-width="2" />
              <ellipse cx="124" cy="100" rx="7" ry="9" fill="#0284c7" stroke="#075985" stroke-width="2" />
            </g>
          </g>
        </svg>
      </div>
    `;
  }
}
