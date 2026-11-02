// Join byte arrays end to end. `Buffer` does not exist in a React Native App, so the channel works in `Uint8Array`.
export function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;

  for (const part of parts) {
    joined.set(part, at);
    at += part.length;
  }

  return joined;
}

const utf8 = { encode: new TextEncoder(), decode: new TextDecoder() };

export const textBytes = (text: string): Uint8Array => utf8.encode.encode(text);

export const bytesText = (bytes: Uint8Array): string =>
  utf8.decode.decode(bytes);

const base64Chunk = 0x8000;

export function bytesBase64(bytes: Uint8Array): string {
  let binary = '';

  for (let at = 0; at < bytes.length; at += base64Chunk)
    binary += String.fromCharCode(...bytes.subarray(at, at + base64Chunk));

  return btoa(binary);
}

const hexRadix = 16;

const hexDigits = 2;

export const bytesHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) =>
    byte.toString(hexRadix).padStart(hexDigits, '0'),
  ).join('');

export const hexBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/../g) ?? [], (pair) =>
    Number.parseInt(pair, hexRadix),
  );
