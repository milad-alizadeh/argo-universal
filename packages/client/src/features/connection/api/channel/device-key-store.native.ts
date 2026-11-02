import { getRandomBytes } from 'expo-crypto';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { bytesHex, hexBytes } from './bytes';
import { keyBytes, keypairFromPrivateKey, type Keypair } from './x25519';

const storeKey = 'argo.device-key';

/*
 * This Device's long-term key, in the iOS Keychain or Android Keystore (ADR-0045). One is made the first time it is asked for and kept; a Device that cannot store it securely throws here and gets no Connection, rather than holding a key anywhere readable.
 */
export async function loadDeviceKey(): Promise<Keypair> {
  const kept = await getItemAsync(storeKey);

  if (kept !== null) return keypairFromPrivateKey(hexBytes(kept));

  const made = getRandomBytes(keyBytes);
  await setItemAsync(storeKey, bytesHex(made));

  return keypairFromPrivateKey(made);
}
