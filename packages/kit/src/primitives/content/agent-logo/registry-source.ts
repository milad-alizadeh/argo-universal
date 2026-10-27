export type IconSource =
  | { kind: 'inline'; xml: string }
  | { kind: 'uri'; uri: string }
  | { kind: 'unavailable' };

export function decodeSource(
  iconUri: string,
  color: string | undefined,
): IconSource {
  try {
    const xml = decodeInlineSvgDataUri(iconUri, color);

    return xml === null
      ? { kind: 'uri', uri: iconUri }
      : { kind: 'inline', xml };
  } catch (error) {
    console.error('Registry icon decoding failed', error);

    return { kind: 'unavailable' };
  }
}

function decodeInlineSvgDataUri(
  iconUri: string,
  color: string | undefined,
): string | null {
  const comma = iconUri.indexOf(',');
  const header = iconUri.slice(0, comma).split(';');

  if (header[0] !== 'data:image/svg+xml') return null;

  if (header.includes('base64')) return null;

  return withViewBox(
    withColor(decodeURIComponent(iconUri.slice(comma + 1)), color),
  );
}

const withColor = (xml: string, color: string | undefined): string =>
  color === undefined ? xml : xml.replaceAll(/currentColor/gi, color);

// An SVG with a width and height but no viewBox draws at its own size in the corner of the box; a viewBox scales it to fill the box, centred.
function withViewBox(xml: string): string {
  const [open] = /<svg\b[^>]*>/i.exec(xml) ?? [''];
  const viewBox = missingViewBox(open);

  return viewBox
    ? xml.replace(open, open.replace(/<svg\b/i, `<svg viewBox="${viewBox}"`))
    : xml;
}

function missingViewBox(open: string): string | undefined {
  if (/\bviewBox\s*=/i.test(open)) return undefined;

  const size = [
    numberAttribute(open, 'width'),
    numberAttribute(open, 'height'),
  ];

  return size.every(Boolean) ? `0 0 ${size.join(' ')}` : undefined;
}

function numberAttribute(open: string, name: string): string | undefined {
  return new RegExp(`\\b${name}\\s*=\\s*["']?([\\d.]+)`, 'i').exec(open)?.[1];
}
