const channelMax = 255;

// Red, green and blue; the pixel's alpha is left out.
const channels = 3;

let painter: CanvasRenderingContext2D | null | undefined;

// One pixel the browser paints a colour into, so any colour CSS can write, a theme's oklch included, reads back as sRGB.
function onePixel(): CanvasRenderingContext2D | null {
  painter ??= document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true });

  return painter;
}

function painted(pixel: CanvasRenderingContext2D, colour: string): number[] {
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = colour;
  pixel.fillRect(0, 0, 1, 1);

  return [...pixel.getImageData(0, 0, 1, 1).data.subarray(0, channels)];
}

// A CSS colour as the shader's red, green and blue, each from 0 to 1; black where the window cannot paint one.
export function rgbOf(colour: string): Float32Array {
  const pixel = onePixel();
  const read = pixel ? painted(pixel, colour) : [0, 0, 0];

  return Float32Array.from(read, (channel) => channel / channelMax);
}
