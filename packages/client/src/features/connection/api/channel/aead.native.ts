import { createCipheriv, createDecipheriv } from 'react-native-quick-crypto';
import type { Aead } from './aead';
import { nativeAead } from './native-aead';

const algorithm = 'chacha20-poly1305';

/*
 * ChaCha20-Poly1305 on iOS and Android through react-native-quick-crypto's JSI binding. Hermes has no JIT, so the JavaScript cipher runs at a few MB/s and a large Feed page blocks the JS thread; this runs natively. The library's tag length defaults to 16 bytes, which is the channel's.
 */
export const aead: Aead = nativeAead({
  createSealer: (key, nonce) => createCipheriv(algorithm, key, nonce),
  createOpener: (key, nonce) => createDecipheriv(algorithm, key, nonce),
});
