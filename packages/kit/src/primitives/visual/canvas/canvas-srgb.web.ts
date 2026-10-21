const converted = new Map<string, string>();

const hexRadix = 16;

const channelWidth = 2;

let context: CanvasRenderingContext2D | null | undefined;

function colorContext(): CanvasRenderingContext2D {
  if (context === undefined)
    context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true });

  if (!context) throw new Error('Canvas colour conversion is unavailable');

  return context;
}

// CanvasKit does not parse Tailwind's OKLCH strings; the browser resolves token colours into sRGB.
export function skiaColor(token: string): string {
  const cached = converted.get(token);

  if (cached) return cached;
  const canvas = colorContext();
  canvas.clearRect(0, 0, 1, 1);
  canvas.fillStyle = token;
  canvas.fillRect(0, 0, 1, 1);
  const bytes = canvas.getImageData(0, 0, 1, 1).data;
  const value = `#${Array.from(bytes, (byte) => byte.toString(hexRadix).padStart(channelWidth, '0')).join('')}`;
  converted.set(token, value);

  return value;
}
