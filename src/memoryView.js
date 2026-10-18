/**
 * Memory & State Visualizer
 * Renders variables as physical boxes, handles call stack frames and retro terminal output.
 */

export class MemoryView {
  constructor(memoryEl, stackEl, consoleEl, inputModalEl) {
    this.memoryEl = memoryEl;
    this.stackEl = stackEl;
    this.consoleEl = consoleEl;
    this.inputModalEl = inputModalEl;
  }

  render({ memory = {}, callStack = [], changedVar = null, readVar = null, stdout = '' }) {
    this.renderVariables(memory, changedVar, readVar);
    this.renderStack(callStack);
    this.renderConsole(stdout);
  }

  renderVariables(memory, changedVar, readVar) {
    if (!this.memoryEl) return;

    const varNames = Object.keys(memory);
    if (varNames.length === 0) {
      this.memoryEl.innerHTML = `
        <div class="empty-memory-hint">
          <span class="hint-icon">📦</span>
          <p>Пока в памяти нет переменных.<br><small>Когда программа создаст переменную (например, <code>x = 5</code>), здесь появится коробочка!</small></p>
        </div>
      `;
      return;
    }

    let html = '<div class="variables-grid">';
    for (const name of varNames) {
      const varInfo = memory[name];
      const isChanged = name === changedVar;
      const isRead = name === readVar;

      let cardClasses = 'variable-box';
      if (isChanged) cardClasses += ' just-changed';
      if (isRead) cardClasses += ' just-read';

      const typeBadgeClass = `type-${varInfo.type}`;

      html += `
        <div class="${cardClasses}" data-var="${name}">
          <div class="var-header">
            <span class="var-name">📦 ${name}</span>
            <span class="var-type-badge ${typeBadgeClass}">${varInfo.type}</span>
          </div>
          <div class="var-content">
            ${this.renderValueFormatted(varInfo)}
          </div>
          ${isChanged ? '<span class="status-chip chip-new">Записано! ✨</span>' : ''}
          ${isRead ? '<span class="status-chip chip-read">Прочитано 👁️</span>' : ''}
        </div>
      `;
    }
    html += '</div>';

    this.memoryEl.innerHTML = html;
  }

  renderValueFormatted(varInfo) {
    if (varInfo.type === 'list' && Array.isArray(varInfo.rawValue)) {
      if (varInfo.rawValue.length === 0) {
        return '<div class="list-empty">Пустой список: []</div>';
      }
      return `
        <div class="list-shelf">
          ${varInfo.rawValue.map((item, idx) => `
            <div class="list-slot">
              <span class="slot-idx">[${idx}]</span>
              <span class="slot-val">${this.escapeHtml(this.formatSimple(item))}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="var-value ${varInfo.type}-val">${this.escapeHtml(varInfo.value)}</div>`;
  }

  formatSimple(val) {
    if (typeof val === 'string') return `"${val}"`;
    if (val === null) return 'None';
    if (val === true) return 'True';
    if (val === false) return 'False';
    return String(val);
  }

  renderStack(callStack) {
    if (!this.stackEl) return;

    if (!callStack || callStack.length === 0) {
      this.stackEl.innerHTML = `
        <div class="stack-main-frame">
          <span class="frame-tag">Глобальная область</span>
          <span class="frame-name">&lt;module&gt; Основная программа</span>
        </div>
      `;
      return;
    }

    let html = `
      <div class="stack-main-frame">
        <span class="frame-tag">Глобальная область</span>
        <span class="frame-name">&lt;module&gt;</span>
      </div>
    `;

    for (const frame of callStack) {
      html += `
        <div class="stack-call-frame active-frame">
          <div class="frame-title">
            <span class="frame-icon">⚡</span>
            <span class="frame-fn">def ${frame.name}()</span>
            <span class="frame-line">строка ${frame.line}</span>
          </div>
        </div>
      `;
    }

    this.stackEl.innerHTML = html;
  }

  renderConsole(stdout) {
    if (!this.consoleEl) return;

    if (!stdout) {
      this.consoleEl.innerHTML = `
        <div class="terminal-empty">
          <span class="term-cursor">_</span>
          <span class="term-placeholder">Экран терминала (здесь появится вывод команды print)</span>
        </div>
      `;
      return;
    }

    this.consoleEl.innerHTML = `
      <pre class="terminal-text">${this.escapeHtml(stdout)}<span class="term-cursor">_</span></pre>
    `;

    // Auto-scroll to bottom
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
  }

  promptInput(promptText, defaultValue = '') {
    return new Promise((resolve) => {
      if (!this.inputModalEl) {
        const val = window.prompt(promptText || 'Введите значение:', defaultValue);
        resolve(val || '');
        return;
      }

      this.inputModalEl.innerHTML = `
        <div class="input-dialog">
          <div class="dialog-header">
            <span class="dialog-icon">⌨️</span>
            <h3>Программа ждёт ввод от пользователя!</h3>
          </div>
          <p class="dialog-prompt">${this.escapeHtml(promptText || 'Введите значение:')}</p>
          <input type="text" class="dialog-input" value="${this.escapeHtml(defaultValue)}" autofocus />
          <div class="dialog-actions">
            <button class="btn btn-primary dialog-submit-btn">Отправить (Enter)</button>
          </div>
        </div>
      `;
      this.inputModalEl.classList.add('visible');

      const input = this.inputModalEl.querySelector('.dialog-input');
      const submitBtn = this.inputModalEl.querySelector('.dialog-submit-btn');

      input.focus();
      input.select();

      const finish = () => {
        const val = input.value;
        this.inputModalEl.classList.remove('visible');
        resolve(val);
      };

      submitBtn.onclick = finish;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          finish();
        }
      };
    });
  }

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
