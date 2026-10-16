// A custom symbol's path in 100-point type, the units of the system symbols, and its symbol box as an SVG viewBox.
export interface SymbolPath {
  viewBox: string;
  d: string;
}

interface SymbolBox {
  width: number;
  height: number;
}

// SF Symbols draw like text: every symbol in a role at the size that makes `circle` fill this share of the role's box.
export const referenceShare = 0.88;

// `circle` is this wide in 100-point type.
const referenceSymbolCustomUnits = 117;

function symbolBox(path: SymbolPath): SymbolBox {
  const [, , width = 0, height = 0] = path.viewBox.split(' ').map(Number);

  return { width, height };
}

// The symbol box drawn in an icon box of `pixels`, sized as the system symbols are; a box larger than `circle` shrinks to it.
export function symbolPathSize(path: SymbolPath, pixels: number): SymbolBox {
  const box = symbolBox(path);

  const scale =
    (pixels * referenceShare) /
    Math.max(referenceSymbolCustomUnits, box.width, box.height);

  return { width: box.width * scale, height: box.height * scale };
}

// The symbol as an SVG data URL, for the page to use as a mask like the system symbols' PNGs.
export function symbolPathImage({ viewBox, d }: SymbolPath): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
