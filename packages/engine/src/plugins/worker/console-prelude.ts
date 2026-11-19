import { consoleMessageLimitBytes } from '../protocol/runtime.ts';

// Format inside the realm so Plugin objects and exceptions never cross into the worker.
export const consolePrelude = `
  (() => {
    const write = globalThis.__argoConsole;
    delete globalThis.__argoConsole;
    const stringify = JSON.stringify;
    const string = String;
    const console = {};
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
      console[level] = (...args) => {
        if (!write) return;
        let text = '';
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          let part;
          try {
            part = typeof arg === 'object'
              ? stringify(arg) ?? string(arg)
              : string(arg);
          } catch {
            part = '[unprintable]';
          }
          text += (i ? ' ' : '') + part;
          if (text.length > ${consoleMessageLimitBytes}) return;
        }
        write(level, text);
      };
    }
    globalThis.console = console;
  })();
`;
