const controlOffset = 64;

const lastControlCode = 95;

export const terminalControl = (text: string): string => {
  if (text.length !== 1) return text;
  const code = text.toUpperCase().charCodeAt(0);

  return isControlCode(code) ? String.fromCharCode(code - controlOffset) : text;
};

const isControlCode = (code: number): boolean =>
  code >= controlOffset && code <= lastControlCode;
