import {
  Buffer,
  createCipheriv,
  createDecipheriv,
} from 'react-native-quick-crypto';
import type { Aead } from './aead';
import { concatBytes } from './bytes';

const algorithm = 'chacha20-poly1305';

const tagBytes = 16;

/*
 * ChaCha20-Poly1305 on iOS and Android through react-native-quick-crypto's JSI binding. Hermes has no JIT, so the JavaScript cipher runs at a few MB/s and a large Feed page blocks the JS thread; this runs natively. The library's tag length defaults to 16 bytes, which is the channel's. Its `setAAD` and `setAuthTag` take its own `Buffer`.
 */
export const aead: Aead = {
  seal: ({ key, nonce, associated }, plaintext) => {
    const cipher = createCipheriv(algorithm, key, nonce);

    cipher.setAAD(Buffer.from(associated));

    return concatBytes(
      cipher.update(plaintext),
      cipher.final(),
      cipher.getAuthTag(),
    );
  },
  open: ({ key, nonce, associated }, record) => {
    if (record.length < tagBytes)
      throw new Error('Record is too short to authenticate');

    const decipher = createDecipheriv(algorithm, key, nonce);

    decipher.setAAD(Buffer.from(associated));
    decipher.setAuthTag(Buffer.from(record.subarray(record.length - tagBytes)));

    try {
      return concatBytes(
        decipher.update(record.subarray(0, record.length - tagBytes)),
        decipher.final(),
      );
    } catch {
      throw new Error('Record failed to authenticate');
    }
  },
};
