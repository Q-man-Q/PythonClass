/**
 * Educational Python Step Tracer & Virtual Machine
 * Generates granular educational steps for visualizing code execution.
 */

import { tokenize } from './lexer.js';
import { parse } from './parser.js';

export class Tracer {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.maxSteps = options.maxSteps || 2000;
    this.inputHandler = options.inputHandler || null;
    this.inputsQueue = options.inputs ? [...options.inputs] : [];
    this.steps = [];
    this.stepCount = 0;
    this.stdout = '';
    this.globals = new Map();
    this.functions = new Map();
    this.callStack = [];
    this.terminated = false;
  }

  captureMemory() {
    const memory = {};
    const currentScope = this.callStack.length > 0
      ? this.callStack[this.callStack.length - 1].locals
      : this.globals;

    for (const [name, val] of currentScope.entries()) {
      memory[name] = {
        value: this.formatValue(val),
        rawValue: val,
        type: this.getTypeName(val)
      };
    }
    return memory;
  }

  formatValue(val) {
    if (val === null) return 'None';
    if (val === true) return 'True';
    if (val === false) return 'False';
    if (typeof val === 'string') return `"${val}"`;
    if (Array.isArray(val)) {
      return '[' + val.map(v => this.formatValue(v)).join(', ') + ']';
    }
    return String(val);
  }

  getTypeName(val) {
    if (val === null) return 'NoneType';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
    if (typeof val === 'string') return 'str';
    if (Array.isArray(val)) return 'list';
    if (typeof val === 'function') return 'function';
    return typeof val;
  }

  addStep({ node, action, message, pose = 'point', evalBadge = null, changedVar = null, readVar = null, isInputWait = false, prompt = '' }) {
    if (this.stepCount >= this.maxSteps) {
      if (!this.terminated) {
        this.terminated = true;
        this.steps.push({
          id: this.steps.length,
          node,
          action: 'LIMIT_EXCEEDED',
          message: '⚠️ Программа выполнила слишком много шагов! Остановлено для защиты от зависания.',
          pose: 'error',
          evalBadge: null,
          memory: this.captureMemory(),
          callStack: this.getCallStackSnapshot(),
          stdout: this.stdout,
          line: node ? node.line : 1,
          col: node ? node.col : 0,
          endLine: node ? node.endLine : 1,
          endCol: node ? node.endCol : 0
        });
      }
      return;
    }

    this.stepCount++;
    const step = {
      id: this.steps.length,
      node,
      action,
      message,
      pose,
      evalBadge,
      changedVar,
      readVar,
      isInputWait,
      prompt,
      memory: this.captureMemory(),
      callStack: this.getCallStackSnapshot(),
      stdout: this.stdout,
      line: node ? node.line : 1,
      col: node ? node.col : 0,
      endLine: node ? node.endLine : 1,
      endCol: node ? node.endCol : 0
    };
    this.steps.push(step);
  }

  getCallStackSnapshot() {
    return this.callStack.map(frame => ({
      name: frame.name,
      line: frame.line
    }));
  }

  getVar(name) {
    if (this.callStack.length > 0) {
      const locals = this.callStack[this.callStack.length - 1].locals;
      if (locals.has(name)) return locals.get(name);
    }
    if (this.globals.has(name)) return this.globals.get(name);
    return undefined;
  }

  setVar(name, value) {
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].locals.set(name, value);
    } else {
      this.globals.set(name, value);
    }
  }

  trace() {
    this.addStep({
      node: this.ast.body[0] || this.ast,
      action: 'START',
      message: 'Привет! Я твой помощник. Давай посмотрим, как Python выполняет этот код строчка за строчкой!',
      pose: 'celebrate'
    });

    try {
      this.executeBlock(this.ast.body);
    } catch (err) {
      if (!err.isReturn) {
        this.addStep({
          node: null,
          action: 'ERROR',
          message: `Ошибка: ${err.message}`,
          pose: 'error'
        });
      }
    }

    if (!this.terminated) {
      this.addStep({
        node: this.ast.body[this.ast.body.length - 1] || this.ast,
        action: 'FINISH',
        message: '🎉 Программа успешно завершила работу! Отличный результат!',
        pose: 'celebrate'
      });
    }

    return this.steps;
  }

  executeBlock(statements) {
    for (const stmt of statements) {
      if (this.stepCount >= this.maxSteps) break;
      this.executeStatement(stmt);
    }
  }

  executeStatement(stmt) {
    if (!stmt || this.stepCount >= this.maxSteps) return;

    this.addStep({
      node: stmt,
      action: 'LINE_START',
      message: `Строка ${stmt.line}: переходим к выполнению.`,
      pose: 'walk'
    });

    switch (stmt.type) {
      case 'Assign':
        this.executeAssign(stmt);
        break;
      case 'AugAssign':
        this.executeAugAssign(stmt);
        break;
      case 'ExprStmt':
        this.evaluateExpression(stmt.value);
        break;
      case 'If':
        this.executeIf(stmt);
        break;
      case 'While':
        this.executeWhile(stmt);
        break;
      case 'For':
        this.executeFor(stmt);
        break;
      case 'FunctionDef':
        this.executeFunctionDef(stmt);
        break;
      case 'Return':
        this.executeReturn(stmt);
        break;
      case 'Pass':
        this.addStep({
          node: stmt,
          action: 'PASS',
          message: 'Команда pass ничего не делает — просто переходим дальше.',
          pose: 'idle'
        });
        break;
      case 'Break':
        this.addStep({
          node: stmt,
          action: 'BREAK',
          message: 'Команда break: досрочно выходим из цикла!',
          pose: 'walk'
        });
        const breakErr = new Error('break');
        breakErr.isBreak = true;
        throw breakErr;
      case 'Continue':
        this.addStep({
          node: stmt,
          action: 'CONTINUE',
          message: 'Команда continue: переходим сразу к следующему витку цикла.',
          pose: 'walk'
        });
        const contErr = new Error('continue');
        contErr.isContinue = true;
        throw contErr;
      default:
        break;
    }
  }

  executeAssign(stmt) {
    const val = this.evaluateExpression(stmt.value);

    if (stmt.target.type === 'Name') {
      const varName = stmt.target.id;
      this.setVar(varName, val);
      this.addStep({
        node: stmt.target,
        action: 'ASSIGN',
        message: `Записываем значение ${this.formatValue(val)} в коробочку переменной '${varName}' 📦`,
        pose: 'carry',
        changedVar: varName,
        evalBadge: { text: `${varName} = ${this.formatValue(val)}`, val }
      });
    } else if (stmt.target.type === 'Subscript') {
      const arr = this.evaluateExpression(stmt.target.value);
      const idx = this.evaluateExpression(stmt.target.index);
      if (Array.isArray(arr)) {
        arr[idx] = val;
        this.addStep({
          node: stmt.target,
          action: 'ASSIGN_SUBSCRIPT',
          message: `Обновляем элемент списка по индексу [${idx}] на значение ${this.formatValue(val)}.`,
          pose: 'carry'
        });
      }
    }
  }

  executeAugAssign(stmt) {
    if (stmt.target.type !== 'Name') return;
    const varName = stmt.target.id;
    const currentVal = this.getVar(varName);

    if (currentVal === undefined) {
      throw new Error(`Переменная '${varName}' не определена!`);
    }

    const delta = this.evaluateExpression(stmt.value);
    let newVal;

    switch (stmt.op) {
      case '+': newVal = currentVal + delta; break;
      case '-': newVal = currentVal - delta; break;
      case '*': newVal = currentVal * delta; break;
      case '/': newVal = currentVal / delta; break;
      case '//': newVal = Math.floor(currentVal / delta); break;
      case '%': newVal = currentVal % delta; break;
      default: newVal = currentVal + delta;
    }

    this.setVar(varName, newVal);
    this.addStep({
      node: stmt,
      action: 'AUG_ASSIGN',
      message: `Изменяем '${varName}': было ${this.formatValue(currentVal)}, стало ${this.formatValue(newVal)} (операция ${stmt.op}=).`,
      pose: 'calc',
      changedVar: varName,
      evalBadge: { text: `${varName} = ${this.formatValue(newVal)}`, val: newVal }
    });
  }

  executeIf(stmt) {
    this.addStep({
      node: stmt.test,
      action: 'IF_CHECK',
      message: 'Проверяем условие оператора if...',
      pose: 'think'
    });

    const testVal = this.evaluateExpression(stmt.test);
    const isTrue = Boolean(testVal);

    this.addStep({
      node: stmt.test,
      action: 'IF_RESULT',
      message: isTrue
        ? `Условие истинно (${this.formatValue(testVal)}) ✅ Заходим внутрь блока if!`
        : `Условие ложно (${this.formatValue(testVal)}) ❌ Пропускаем блок if.`,
      pose: isTrue ? 'celebrate' : 'walk',
      evalBadge: { text: isTrue ? 'True ✅' : 'False ❌', val: isTrue }
    });

    if (isTrue) {
      this.executeBlock(stmt.body);
      return;
    }

    if (stmt.elifs && stmt.elifs.length > 0) {
      for (const elif of stmt.elifs) {
        this.addStep({
          node: elif.test,
          action: 'ELIF_CHECK',
          message: 'Проверяем условие elif...',
          pose: 'think'
        });

        const elifVal = this.evaluateExpression(elif.test);
        const elifTrue = Boolean(elifVal);

        this.addStep({
          node: elif.test,
          action: 'ELIF_RESULT',
          message: elifTrue
            ? `Условие elif истинно (${this.formatValue(elifVal)}) ✅ Выполняем эту ветку!`
            : `Условие elif ложно (${this.formatValue(elifVal)}) ❌ Идём дальше.`,
          pose: elifTrue ? 'celebrate' : 'walk',
          evalBadge: { text: elifTrue ? 'True ✅' : 'False ❌', val: elifTrue }
        });

        if (elifTrue) {
          this.executeBlock(elif.body);
          return;
        }
      }
    }

    if (stmt.orelse && stmt.orelse.length > 0) {
      this.addStep({
        node: stmt,
        action: 'ELSE_ENTER',
        message: 'Все условия выше оказались ложными. Заходим в ветку else!',
        pose: 'walk'
      });
      this.executeBlock(stmt.orelse);
    }
  }

  executeWhile(stmt) {
    let iteration = 0;
    while (this.stepCount < this.maxSteps) {
      iteration++;
      this.addStep({
        node: stmt.test,
        action: 'WHILE_CHECK',
        message: `Виток цикла №${iteration}: проверяем условие while...`,
        pose: 'think'
      });

      const testVal = this.evaluateExpression(stmt.test);
      const isTrue = Boolean(testVal);

      this.addStep({
        node: stmt.test,
        action: 'WHILE_RESULT',
        message: isTrue
          ? `Условие верно (${this.formatValue(testVal)}) ✅ Выполняем тело цикла!`
          : `Условие больше не выполняется (${this.formatValue(testVal)}) ❌ Завершаем цикл while!`,
        pose: isTrue ? 'walk' : 'celebrate',
        evalBadge: { text: isTrue ? 'True ✅' : 'False ❌', val: isTrue }
      });

      if (!isTrue) break;

      try {
        this.executeBlock(stmt.body);
      } catch (err) {
        if (err.isBreak) break;
        if (err.isContinue) continue;
        throw err;
      }
    }
  }

  executeFor(stmt) {
    const iterVal = this.evaluateExpression(stmt.iter);
    let items = [];

    if (Array.isArray(iterVal)) {
      items = iterVal;
    } else if (typeof iterVal === 'string') {
      items = iterVal.split('');
    } else {
      throw new Error(`Объект '${this.formatValue(iterVal)}' нельзя перебрать в цикле for!`);
    }

    this.addStep({
      node: stmt,
      action: 'FOR_START',
      message: `Цикл for: будем перебирать элементы: [${items.join(', ')}].`,
      pose: 'walk'
    });

    const targetVar = stmt.target.id;
    for (let i = 0; i < items.length; i++) {
      if (this.stepCount >= this.maxSteps) break;
      const currentItem = items[i];
      this.setVar(targetVar, currentItem);

      this.addStep({
        node: stmt.target,
        action: 'FOR_STEP',
        message: `Шаг ${i + 1} из ${items.length}: '${targetVar}' = ${this.formatValue(currentItem)}.`,
        pose: 'carry',
        changedVar: targetVar,
        evalBadge: { text: `${targetVar} = ${this.formatValue(currentItem)}`, val: currentItem }
      });

      try {
        this.executeBlock(stmt.body);
      } catch (err) {
        if (err.isBreak) break;
        if (err.isContinue) continue;
        throw err;
      }
    }

    this.addStep({
      node: stmt,
      action: 'FOR_END',
      message: 'Цикл for завершился: все элементы пройдены! 🏁',
      pose: 'celebrate'
    });
  }

  executeFunctionDef(stmt) {
    this.functions.set(stmt.name, stmt);
    this.addStep({
      node: stmt,
      action: 'FUNC_DEF',
      message: `Определена функция '${stmt.name}'. Запоминаем её правила в память программы.`,
      pose: 'think'
    });
  }

  executeReturn(stmt) {
    let retVal = null;
    if (stmt.value) {
      retVal = this.evaluateExpression(stmt.value);
    }
    this.addStep({
      node: stmt,
      action: 'RETURN',
      message: `Команда return: функция возвращает результат ${this.formatValue(retVal)}.`,
      pose: 'carry',
      evalBadge: { text: `Return ${this.formatValue(retVal)}`, val: retVal }
    });

    const returnErr = new Error('return');
    returnErr.isReturn = true;
    returnErr.returnValue = retVal;
    throw returnErr;
  }

  evaluateExpression(expr) {
    if (!expr) return null;

    switch (expr.type) {
      case 'Literal': {
        this.addStep({
          node: expr,
          action: 'EVAL_LITERAL',
          message: `Константа: значение ${this.formatValue(expr.value)} (тип ${expr.valueType}).`,
          pose: 'point',
          evalBadge: { text: this.formatValue(expr.value), val: expr.value }
        });
        return expr.value;
      }

      case 'Name': {
        const val = this.getVar(expr.id);
        if (val === undefined) {
          throw new Error(`Имя '${expr.id}' не найдено! Возможно, переменная ещё не создана.`);
        }
        this.addStep({
          node: expr,
          action: 'READ_VAR',
          message: `Смотрим в память: в переменной '${expr.id}' лежит ${this.formatValue(val)}.`,
          pose: 'point',
          readVar: expr.id,
          evalBadge: { text: `${expr.id}: ${this.formatValue(val)}`, val }
        });
        return val;
      }

      case 'List': {
        const elements = [];
        for (const el of expr.elements) {
          elements.push(this.evaluateExpression(el));
        }
        this.addStep({
          node: expr,
          action: 'EVAL_LIST',
          message: `Создан список: [${elements.map(v => this.formatValue(v)).join(', ')}].`,
          pose: 'celebrate'
        });
        return elements;
      }

      case 'Subscript': {
        const target = this.evaluateExpression(expr.value);
        const idx = this.evaluateExpression(expr.index);
        let res;
        if (Array.isArray(target) || typeof target === 'string') {
          const actualIdx = idx < 0 ? target.length + idx : idx;
          if (actualIdx < 0 || actualIdx >= target.length) {
            throw new Error(`Индекс ${idx} выходит за границы (длина: ${target.length})!`);
          }
          res = target[actualIdx];
        } else {
          throw new Error(`Нельзя применить индекс к ${this.formatValue(target)}!`);
        }
        this.addStep({
          node: expr,
          action: 'SUBSCRIPT',
          message: `Берём элемент по индексу [${idx}]: получили ${this.formatValue(res)}.`,
          pose: 'point',
          evalBadge: { text: `[${idx}] -> ${this.formatValue(res)}`, val: res }
        });
        return res;
      }

      case 'UnaryOp': {
        const arg = this.evaluateExpression(expr.argument);
        let res;
        if (expr.op === '-') res = -arg;
        else if (expr.op === '+') res = +arg;
        else if (expr.op === 'not') res = !Boolean(arg);
        this.addStep({
          node: expr,
          action: 'UNARY_OP',
          message: `Операция '${expr.op}': результат ${this.formatValue(res)}.`,
          pose: 'calc',
          evalBadge: { text: `${expr.op}(${this.formatValue(arg)}) = ${this.formatValue(res)}`, val: res }
        });
        return res;
      }

      case 'BinOp': {
        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);
        let res;

        switch (expr.op) {
          case '+':
            res = left + right;
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Складываем: ${this.formatValue(left)} + ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} + ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          case '-':
            res = left - right;
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Вычитаем: ${this.formatValue(left)} - ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} - ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          case '*':
            if (typeof left === 'string' && typeof right === 'number') {
              res = left.repeat(Math.max(0, right));
            } else if (typeof right === 'string' && typeof left === 'number') {
              res = right.repeat(Math.max(0, left));
            } else {
              res = left * right;
            }
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Умножаем: ${this.formatValue(left)} * ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} * ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          case '/':
            if (right === 0) throw new Error('Деление на ноль! (ZeroDivisionError)');
            res = left / right;
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Делим: ${this.formatValue(left)} / ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} / ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          case '//':
            if (right === 0) throw new Error('Деление на ноль! (ZeroDivisionError)');
            res = Math.floor(left / right);
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Целочисленное деление: ${this.formatValue(left)} // ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} // ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          case '%':
            if (right === 0) throw new Error('Остаток от деления на ноль!');
            res = left % right;
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Остаток от деления: ${this.formatValue(left)} % ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} % ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          case '**':
            res = Math.pow(left, right);
            this.addStep({
              node: expr,
              action: 'BIN_OP',
              message: `Степень: ${this.formatValue(left)} ** ${this.formatValue(right)} ➔ ${this.formatValue(res)}.`,
              pose: 'calc',
              evalBadge: { text: `${this.formatValue(left)} ** ${this.formatValue(right)} = ${this.formatValue(res)}`, val: res }
            });
            break;
          default:
            res = left + right;
        }
        return res;
      }

      case 'Compare': {
        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);
        let res = false;

        switch (expr.op) {
          case '==': res = left === right; break;
          case '!=': res = left !== right; break;
          case '<': res = left < right; break;
          case '<=': res = left <= right; break;
          case '>': res = left > right; break;
          case '>=': res = left >= right; break;
          case 'in':
            res = Array.isArray(right) ? right.includes(left) : String(right).includes(String(left));
            break;
          default:
            res = false;
        }

        const msgRes = res ? 'Истина (True) ✅' : 'Ложь (False) ❌';
        this.addStep({
          node: expr,
          action: 'COMPARE',
          message: `Сравниваем: ${this.formatValue(left)} ${expr.op} ${this.formatValue(right)}? Результат: ${msgRes}.`,
          pose: res ? 'celebrate' : 'think',
          evalBadge: { text: `${this.formatValue(left)} ${expr.op} ${this.formatValue(right)} -> ${res ? 'True' : 'False'}`, val: res }
        });
        return res;
      }

      case 'LogicalOp': {
        if (expr.op === 'and') {
          const left = this.evaluateExpression(expr.left);
          if (!left) {
            this.addStep({
              node: expr,
              action: 'LOGICAL_AND_SHORT',
              message: `Левая часть 'and' ложна (${this.formatValue(left)}), поэтому правая часть не вычисляется! Результат: False ❌`,
              pose: 'think',
              evalBadge: { text: 'False ❌', val: false }
            });
            return left;
          }
          const right = this.evaluateExpression(expr.right);
          this.addStep({
            node: expr,
            action: 'LOGICAL_AND',
            message: `Результат 'and': ${right ? 'True ✅' : 'False ❌'}`,
            pose: right ? 'celebrate' : 'think',
            evalBadge: { text: right ? 'True ✅' : 'False ❌', val: Boolean(right) }
          });
          return right;
        }

        if (expr.op === 'or') {
          const left = this.evaluateExpression(expr.left);
          if (left) {
            this.addStep({
              node: expr,
              action: 'LOGICAL_OR_SHORT',
              message: `Левая часть 'or' истинна (${this.formatValue(left)}), поэтому правая часть не нужна! Результат: True ✅`,
              pose: 'celebrate',
              evalBadge: { text: 'True ✅', val: true }
            });
            return left;
          }
          const right = this.evaluateExpression(expr.right);
          this.addStep({
            node: expr,
            action: 'LOGICAL_OR',
            message: `Результат 'or': ${right ? 'True ✅' : 'False ❌'}`,
            pose: right ? 'celebrate' : 'think',
            evalBadge: { text: right ? 'True ✅' : 'False ❌', val: Boolean(right) }
          });
          return right;
        }
        return false;
      }

      case 'Call': {
        return this.evaluateCall(expr);
      }

      default:
        return null;
    }
  }

  evaluateCall(expr) {
    let funcName = '';
    let isMethod = false;
    let targetObj = null;

    if (expr.func.type === 'Name') {
      funcName = expr.func.id;
    } else if (expr.func.type === 'Member') {
      isMethod = true;
      targetObj = this.evaluateExpression(expr.func.object);
      funcName = expr.func.property;
    }

    const argValues = [];
    for (const arg of expr.args) {
      argValues.push(this.evaluateExpression(arg));
    }

    if (isMethod && targetObj) {
      if (Array.isArray(targetObj)) {
        if (funcName === 'append') {
          const item = argValues[0];
          targetObj.push(item);
          this.addStep({
            node: expr,
            action: 'LIST_APPEND',
            message: `Метод .append(): добавили элемент ${this.formatValue(item)} в конец списка 📝`,
            pose: 'carry'
          });
          return null;
        }
        if (funcName === 'pop') {
          const popped = targetObj.pop();
          this.addStep({
            node: expr,
            action: 'LIST_POP',
            message: `Метод .pop(): извлекли последний элемент ${this.formatValue(popped)} из списка!`,
            pose: 'point'
          });
          return popped;
        }
      }
    }

    if (funcName === 'print') {
      const outputText = argValues.map(v => typeof v === 'string' ? v : this.formatValue(v)).join(' ');
      this.stdout += outputText + '\n';

      this.addStep({
        node: expr,
        action: 'PRINT',
        message: `📢 print() выводит на экран: "${outputText}"`,
        pose: 'celebrate',
        evalBadge: { text: `print: ${outputText}`, val: outputText }
      });
      return null;
    }

    if (funcName === 'input') {
      const prompt = argValues.length > 0 ? String(argValues[0]) : '';
      let inputVal = '';

      if (this.inputsQueue.length > 0) {
        inputVal = this.inputsQueue.shift();
      } else {
        inputVal = 'Школа';
      }

      if (prompt) {
        this.stdout += prompt;
      }
      this.stdout += inputVal + '\n';

      this.addStep({
        node: expr,
        action: 'INPUT',
        message: `⌨️ input("${prompt}"): получен ответ пользователя "${inputVal}"`,
        pose: 'walk',
        isInputWait: true,
        prompt,
        evalBadge: { text: `Ввод: "${inputVal}"`, val: inputVal }
      });
      return inputVal;
    }

    if (funcName === 'range') {
      let start = 0, stop = 0, step = 1;
      if (argValues.length === 1) {
        stop = argValues[0];
      } else if (argValues.length === 2) {
        start = argValues[0];
        stop = argValues[1];
      } else if (argValues.length === 3) {
        start = argValues[0];
        stop = argValues[1];
        step = argValues[2];
      }

      const res = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) res.push(i);
      } else if (step < 0) {
        for (let i = start; i > stop; i += step) res.push(i);
      }

      this.addStep({
        node: expr,
        action: 'RANGE',
        message: `range(${argValues.join(', ')}): создана последовательность чисел [${res.join(', ')}].`,
        pose: 'think',
        evalBadge: { text: `[${res.slice(0, 5).join(', ')}${res.length > 5 ? '...' : ''}]`, val: res }
      });
      return res;
    }

    if (funcName === 'len') {
      const obj = argValues[0];
      const length = (Array.isArray(obj) || typeof obj === 'string') ? obj.length : 0;
      this.addStep({
        node: expr,
        action: 'LEN',
        message: `len(${this.formatValue(obj)}): длина равна ${length}.`,
        pose: 'point',
        evalBadge: { text: `len = ${length}`, val: length }
      });
      return length;
    }

    if (funcName === 'int') {
      const res = parseInt(argValues[0], 10) || 0;
      this.addStep({
        node: expr,
        action: 'TYPE_CAST',
        message: `Превращаем ${this.formatValue(argValues[0])} в целое число (int) ➔ ${res}.`,
        pose: 'calc',
        evalBadge: { text: `int: ${res}`, val: res }
      });
      return res;
    }

    if (funcName === 'str') {
      const res = String(argValues[0]);
      this.addStep({
        node: expr,
        action: 'TYPE_CAST',
        message: `Превращаем ${this.formatValue(argValues[0])} в строку (str) ➔ "${res}".`,
        pose: 'calc',
        evalBadge: { text: `str: "${res}"`, val: res }
      });
      return res;
    }

    if (funcName === 'float') {
      return parseFloat(argValues[0]) || 0.0;
    }

    if (funcName === 'abs') {
      return Math.abs(argValues[0]);
    }

    if (this.functions.has(funcName)) {
      const funcDef = this.functions.get(funcName);
      const locals = new Map();

      for (let i = 0; i < funcDef.params.length; i++) {
        const paramName = funcDef.params[i].id;
        const argVal = i < argValues.length ? argValues[i] : null;
        locals.set(paramName, argVal);
      }

      this.addStep({
        node: expr,
        action: 'FUNC_CALL',
        message: `🚀 Вызываем функцию '${funcName}' с аргументами (${argValues.map(v => this.formatValue(v)).join(', ')}). Переходим в её код!`,
        pose: 'walk'
      });

      this.callStack.push({
        name: funcName,
        line: expr.line,
        locals
      });

      let returnValue = null;
      try {
        this.executeBlock(funcDef.body);
      } catch (err) {
        if (err.isReturn) {
          returnValue = err.returnValue;
        } else {
          throw err;
        }
      } finally {
        this.callStack.pop();
      }

      this.addStep({
        node: expr,
        action: 'FUNC_RETURN',
        message: `Возвращаемся из функции '${funcName}' в основную программу. Результат: ${this.formatValue(returnValue)}.`,
        pose: 'celebrate',
        evalBadge: { text: `-> ${this.formatValue(returnValue)}`, val: returnValue }
      });

      return returnValue;
    }

    throw new Error(`Функция '${funcName}' не найдена!`);
  }
}

export function generateTrace(code, options = {}) {
  const tokens = tokenize(code);
  const ast = parse(tokens);
  const tracer = new Tracer(ast, options);
  const steps = tracer.trace();
  return {
    tokens,
    ast,
    steps,
    totalSteps: steps.length
  };
}
