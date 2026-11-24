import * as quickCrypto from 'react-native-quick-crypto';
import type { Aead } from './aead';
import { asNativeCrypto, nativeAead } from './native-aead';

/*
 * ChaCha20-Poly1305 on iOS and Android through react-native-quick-crypto's JSI binding. Hermes has no JIT, so the JavaScript cipher runs at a few MB/s and a large Feed page blocks the JS thread; this runs natively.
 */
export const aead: Aead = nativeAead(asNativeCrypto(quickCrypto));
