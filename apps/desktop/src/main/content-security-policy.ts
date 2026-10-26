// The Expo web build inlines its style reset, and React Native Web inserts styles at runtime. Chart's CanvasKit needs WebAssembly compilation ('wasm-unsafe-eval'), never JavaScript eval.
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.agentclientprotocol.com http://127.0.0.1:*",
  "font-src 'self' data:",
  // Registry resources may also be fetched from the official CDN.
  "connect-src 'self' data: https://cdn.agentclientprotocol.com ws://127.0.0.1:* http://127.0.0.1:*",
].join('; ');
