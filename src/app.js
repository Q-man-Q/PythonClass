/**
 * Main Application Coordinator
 * Binds editor, tracer, character, memory view, sound and timeline controls.
 */

import { generateTrace } from './tracer.js';
import { PRESETS } from './presets.js';
import { CharacterController } from './character.js';
import { MemoryView } from './memoryView.js';
import { sound } from './sound.js';

export class App {
  constructor() {
    this.currentCode = PRESETS[0].code;
    this.traceResult = null;
    this.currentStepIdx = 0;
    this.isPlaying = false;
    this.playbackTimer = null;
    this.speed = 1.0; // 0.5x to 3.0x
    this.granularity = 'detailed'; // 'detailed' or 'line'
    this.isPresentationMode = false;

    this.initDOM();
    this.initComponents();
    this.bindEvents();
    this.loadFromURLOrPreset();
    this.recompileAndRun();
  }

  initDOM() {
    this.dom = {
      editorTextarea: document.getElementById('codeEditor'),
      codeViewer: document.getElementById('codeViewer'),
      editorModeToggle: document.getElementById('toggleEditorMode'),
      editorContainer: document.getElementById('editorContainer'),
      presetSelect: document.getElementById('presetSelect'),
      characterSelect: document.getElementById('characterSelect'),
      characterStage: document.getElementById('characterStage'),
      characterActor: document.getElementById('characterActor'),
      speechBubble: document.getElementById('speechBubble'),
      evalBadge: document.getElementById('evalBadge'),
      particleCanvas: document.getElementById('particleCanvas'),
      memoryContainer: document.getElementById('memoryContainer'),
      callStackContainer: document.getElementById('callStackContainer'),
      terminalConsole: document.getElementById('terminalConsole'),
      inputModal: document.getElementById('inputModal'),
      btnPlayPause: document.getElementById('btnPlayPause'),
      btnStepBack: document.getElementById('btnStepBack'),
      btnStepForward: document.getElementById('btnStepForward'),
      btnReset: document.getElementById('btnReset'),
      timelineSlider: document.getElementById('timelineSlider'),
      stepCounter: document.getElementById('stepCounter'),
      speedSlider: document.getElementById('speedSlider'),
      speedLabel: document.getElementById('speedLabel'),
      granularityToggle: document.getElementById('granularityToggle'),
      soundToggle: document.getElementById('soundToggle'),
      presentationToggle: document.getElementById('presentationToggle'),
      shareBtn: document.getElementById('shareBtn'),
      helpBtn: document.getElementById('helpBtn'),
      helpModal: document.getElementById('helpModal'),
      closeHelpBtn: document.getElementById('closeHelpBtn')
    };
  }

  initComponents() {
    this.character = new CharacterController(
      this.dom.characterActor,
      this.dom.speechBubble,
      this.dom.evalBadge
    );

    this.memoryView = new MemoryView(
      this.dom.memoryContainer,
      this.dom.callStackContainer,
      this.dom.terminalConsole,
      this.dom.inputModal
    );

    // Populate presets dropdown
    this.dom.presetSelect.innerHTML = PRESETS.map(p => `
      <option value="${p.id}">${p.icon} ${p.name}</option>
    `).join('');
  }

  bindEvents() {
    // Preset selection
    this.dom.presetSelect.addEventListener('change', (e) => {
      const selected = PRESETS.find(p => p.id === e.target.value);
      if (selected) {
        this.setCode(selected.code);
      }
    });

    // Character switch
    this.dom.characterSelect.addEventListener('change', (e) => {
      this.character.setCharacter(e.target.value);
      this.updateStepView(this.currentStepIdx);
    });

    // Editor toggle (Edit code vs Visual mode)
    this.dom.editorModeToggle.addEventListener('click', () => {
      const isEditing = this.dom.editorContainer.classList.toggle('edit-mode');
      if (isEditing) {
        this.pause();
        this.dom.editorModeToggle.innerHTML = '<span>👁️</span><span>Готово (Запустить)</span>';
        this.dom.editorTextarea.focus();
      } else {
        this.dom.editorModeToggle.innerHTML = '<span>✏️</span><span>Редактировать код</span>';
        this.setCode(this.dom.editorTextarea.value);
      }
    });

    this.dom.editorTextarea.addEventListener('input', () => {
      this.currentCode = this.dom.editorTextarea.value;
    });

    // Playback Controls
    this.dom.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
    this.dom.btnStepForward.addEventListener('click', () => this.stepForward());
    this.dom.btnStepBack.addEventListener('click', () => this.stepBack());
    this.dom.btnReset.addEventListener('click', () => this.jumpToStep(0));

    // Timeline scrubber
    this.dom.timelineSlider.addEventListener('input', (e) => {
      this.pause();
      this.jumpToStep(parseInt(e.target.value, 10));
    });

    // Speed Slider
    this.dom.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.speed = val;
      this.dom.speedLabel.textContent = `${val.toFixed(1)}x`;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    });

    // Granularity Toggle
    this.dom.granularityToggle.addEventListener('click', () => {
      if (this.granularity === 'detailed') {
        this.granularity = 'line';
        this.dom.granularityToggle.innerHTML = '<span>📄</span><span>Режим: По строкам</span>';
      } else {
        this.granularity = 'detailed';
        this.dom.granularityToggle.innerHTML = '<span>🔍</span><span>Режим: По элементам</span>';
      }
      this.recompileAndRun();
    });

    // Sound Toggle
    this.dom.soundToggle.addEventListener('click', () => {
      const isMuted = !sound.muted;
      sound.setMuted(isMuted);
      this.dom.soundToggle.classList.toggle('muted', isMuted);
      this.dom.soundToggle.innerHTML = isMuted
        ? '<span>🔇</span><span>Звук выкл</span>'
        : '<span>🔊</span><span>Звук вкл</span>';
    });

    // Presentation / Projector Mode
    this.dom.presentationToggle.addEventListener('click', () => {
      this.isPresentationMode = !this.isPresentationMode;
      document.body.classList.toggle('presentation-mode', this.isPresentationMode);
      this.dom.presentationToggle.innerHTML = this.isPresentationMode
        ? '<span>🖥️</span><span>Обычный вид</span>'
        : '<span>📽️</span><span>Для проектора</span>';
      // Re-align character to newly sized elements
      setTimeout(() => this.updateStepView(this.currentStepIdx), 150);
    });

    // Share link
    this.dom.shareBtn.addEventListener('click', () => {
      const encoded = encodeURIComponent(this.currentCode);
      const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        const orig = this.dom.shareBtn.innerHTML;
        this.dom.shareBtn.innerHTML = '<span>✅</span><span>Ссылка скопирована!</span>';
        setTimeout(() => this.dom.shareBtn.innerHTML = orig, 2500);
      });
    });

    // Help modal
    this.dom.helpBtn.addEventListener('click', () => {
      this.dom.helpModal.classList.add('visible');
    });
    this.dom.closeHelpBtn.addEventListener('click', () => {
      this.dom.helpModal.classList.remove('visible');
    });

    // Window resize: re-position character accurately
    window.addEventListener('resize', () => {
      this.updateStepView(this.currentStepIdx);
    });

    // Keyboard navigation (Space = Play/Pause, ArrowRight = Step, ArrowLeft = Back)
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === this.dom.editorTextarea) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.stepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.stepBack();
      }
    });
  }

  loadFromURLOrPreset() {
    const hash = window.location.hash;
    if (hash.startsWith('#code=')) {
      try {
        const decoded = decodeURIComponent(hash.slice(6));
        if (decoded.trim()) {
          this.setCode(decoded);
          return;
        }
      } catch (e) {
        console.error('Failed to parse URL hash code:', e);
      }
    }
    this.setCode(PRESETS[0].code);
  }

  setCode(newCode) {
    this.currentCode = newCode;
    this.dom.editorTextarea.value = newCode;
    this.recompileAndRun();
  }

  recompileAndRun() {
    this.pause();

    try {
      this.traceResult = generateTrace(this.currentCode);

      // If user selected line-only granularity, filter steps
      if (this.granularity === 'line') {
        this.filteredSteps = this.traceResult.steps.filter(s =>
          s.action === 'LINE_START' || s.action === 'START' || s.action === 'FINISH' || s.action === 'ERROR'
        );
      } else {
        this.filteredSteps = this.traceResult.steps;
      }

      this.renderCodeViewer(this.traceResult.tokens);

      this.dom.timelineSlider.max = Math.max(0, this.filteredSteps.length - 1);
      this.dom.timelineSlider.value = 0;
      this.currentStepIdx = 0;
      this.updateStepView(0);
    } catch (err) {
      console.error('Compilation / Parse Error:', err);
      this.renderErrorInViewer(err.message);
    }
  }

  renderCodeViewer(tokens) {
    const lines = this.currentCode.split('\n');
    let html = '';

    for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
      const lineText = lines[lineNum - 1];
      const lineTokens = tokens.filter(t => t.line === lineNum && t.type !== 'NEWLINE' && t.type !== 'EOF');

      html += `<div class="code-line-row" id="line-row-${lineNum}" data-line="${lineNum}">`;
      html += `<span class="line-number">${lineNum}</span>`;
      html += `<div class="line-content" id="line-content-${lineNum}">`;

      if (lineTokens.length === 0) {
        html += `<span class="empty-line">&nbsp;</span>`;
      } else {
        let cursor = 0;
        for (const tok of lineTokens) {
          if (tok.col > cursor) {
            html += this.escapeHtml(lineText.slice(cursor, tok.col));
          }
          const tokClass = `token tok-${tok.type.toLowerCase()}`;
          const tokId = `tok-${lineNum}-${tok.col}`;
          html += `<span class="${tokClass}" id="${tokId}" data-line="${lineNum}" data-col="${tok.col}" data-endcol="${tok.endCol}">${this.escapeHtml(lineText.slice(tok.col, tok.endCol))}</span>`;
          cursor = tok.endCol;
        }
        if (cursor < lineText.length) {
          html += this.escapeHtml(lineText.slice(cursor));
        }
      }

      html += `</div></div>`;
    }

    this.dom.codeViewer.innerHTML = html;
  }

  renderErrorInViewer(errorMsg) {
    this.dom.codeViewer.innerHTML = `
      <div class="code-error-box">
        <h3>🚨 Ошибка в программе!</h3>
        <p>${this.escapeHtml(errorMsg)}</p>
        <button class="btn btn-secondary mt-2" id="fixCodeBtn">Перейти к редактированию</button>
      </div>
    `;
    const fixBtn = document.getElementById('fixCodeBtn');
    if (fixBtn) {
      fixBtn.onclick = () => {
        this.dom.editorModeToggle.click();
      };
    }
    this.character.say(`Ой! Кажется, в коде есть ошибка: ${errorMsg}`, 'error');
  }

  updateStepView(stepIdx) {
    if (!this.filteredSteps || this.filteredSteps.length === 0) return;

    const step = this.filteredSteps[stepIdx];
    if (!step) return;

    this.currentStepIdx = stepIdx;
    this.dom.timelineSlider.value = stepIdx;
    this.dom.stepCounter.textContent = `Шаг ${stepIdx + 1} из ${this.filteredSteps.length}`;

    // Clear previous highlights
    document.querySelectorAll('.active-line, .active-token').forEach(el => {
      el.classList.remove('active-line', 'active-token');
    });

    // Highlight target element in code
    let targetEl = null;
    if (step.line) {
      const lineRow = document.getElementById(`line-row-${step.line}`);
      if (lineRow) {
        lineRow.classList.add('active-line');
        targetEl = lineRow;
      }
      if (step.col !== undefined) {
        const tokEl = document.getElementById(`tok-${step.line}-${step.col}`);
        if (tokEl) {
          tokEl.classList.add('active-token');
          targetEl = tokEl;
        }
      }
    }

    // Position Character strictly in dedicated left lane (never covers code)
    const stageRect = this.dom.characterStage.getBoundingClientRect();
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      const relY = Math.max(6, targetRect.top - stageRect.top - 18);
      const relX = 8; // Strictly on the left side!

      this.character.moveTo(relX, relY, { pose: step.pose });

      if (step.evalBadge) {
        this.character.showBadge(step.evalBadge, targetRect, stageRect);
      } else {
        this.character.hideBadge();
      }

      // Smoothly ensure active line is visible
      if (step.line) {
        const lineRow = document.getElementById(`line-row-${step.line}`);
        if (lineRow && typeof lineRow.scrollIntoView === 'function') {
          lineRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    } else {
      this.character.moveTo(8, 20, { pose: step.pose });
      this.character.hideBadge();
    }

    // Say explanation
    this.character.say(step.message, step.pose);

    // Play Sound Effect
    this.playSoundForStep(step);

    // Update Memory and Console Views
    this.memoryView.render({
      memory: step.memory,
      callStack: step.callStack,
      changedVar: step.changedVar,
      readVar: step.readVar,
      stdout: step.stdout
    });
  }

  playSoundForStep(step) {
    switch (step.action) {
      case 'READ_VAR':
        sound.playPop();
        break;
      case 'BIN_OP':
      case 'AUG_ASSIGN':
        sound.playCalc();
        break;
      case 'ASSIGN':
      case 'LIST_APPEND':
        sound.playStore();
        break;
      case 'PRINT':
        sound.playPrint();
        break;
      case 'IF_RESULT':
      case 'WHILE_RESULT':
        sound.playBranch();
        break;
      case 'START':
      case 'FINISH':
        sound.playCelebrate();
        break;
      case 'ERROR':
      case 'LIMIT_EXCEEDED':
        sound.playError();
        break;
      default:
        break;
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.currentStepIdx >= this.filteredSteps.length - 1) {
      this.currentStepIdx = 0;
    }
    this.isPlaying = true;
    this.dom.btnPlayPause.innerHTML = '<span>⏸️</span><span>Пауза</span>';
    this.dom.btnPlayPause.classList.add('playing');
    this.scheduleNextStep();
  }

  pause() {
    this.isPlaying = false;
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.dom.btnPlayPause.innerHTML = '<span>▶️</span><span>Старт</span>';
    this.dom.btnPlayPause.classList.remove('playing');
  }

  scheduleNextStep() {
    if (!this.isPlaying) return;

    const baseDelay = 1300; // ms per step
    const delay = baseDelay / this.speed;

    this.playbackTimer = setTimeout(() => {
      if (!this.isPlaying) return;

      if (this.currentStepIdx < this.filteredSteps.length - 1) {
        this.stepForward();
        this.scheduleNextStep();
      } else {
        this.pause();
      }
    }, delay);
  }

  stepForward() {
    if (this.currentStepIdx < this.filteredSteps.length - 1) {
      this.updateStepView(this.currentStepIdx + 1);
    }
  }

  stepBack() {
    if (this.currentStepIdx > 0) {
      this.updateStepView(this.currentStepIdx - 1);
    }
  }

  jumpToStep(idx) {
    const targetIdx = Math.max(0, Math.min(this.filteredSteps.length - 1, idx));
    this.updateStepView(targetIdx);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.pythonApp = new App();
});
