// A custom symbol's path in 100-point type, the units of the system symbols, and its symbol box as an SVG viewBox.
export interface SymbolPath {
  viewBox: string;
  d: string;
}

interface SymbolBox {
  width: number;
  height: number;
}

function symbolBox(path: SymbolPath): SymbolBox {
  const [, , width = 0, height = 0] = path.viewBox.split(' ').map(Number);

  return { width, height };
}

// The symbol box fitted to an icon box of `pixels`, as iOS's SymbolView fits a custom symbol, so every platform draws it at one size.
export function symbolPathSize(path: SymbolPath, pixels: number): SymbolBox {
  const box = symbolBox(path);
  const scale = pixels / Math.max(box.width, box.height);

  return { width: box.width * scale, height: box.height * scale };
}

// The symbol as an SVG data URL, for the page to use as a mask like the system symbols' PNGs.
export function symbolPathImage({ viewBox, d }: SymbolPath): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
