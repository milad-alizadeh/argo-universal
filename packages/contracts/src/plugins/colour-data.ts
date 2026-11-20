import { z } from 'zod';

// A colour a Plugin passes because the colour is the data itself, such as a light's (ADR-0026, Colour as data).
export const srgbColour = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/u)
  .describe('An sRGB colour as `#RRGGBB`.');

export const colourStops = z
  .array(srgbColour)
  .min(1)
  .max(4)
  .describe('One to four sRGB colours, drawn as a gradient in order.');
