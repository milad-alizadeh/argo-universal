import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { loginOwnerStorageKey, isLoginOwner } from './login-owner-token';
let ownerPromise: Promise<string> | undefined;
export const loginOwner = (): Promise<string> => (ownerPromise ??= loadOwner());
async function loadOwner(): Promise<string> {
  const saved = await AsyncStorage.getItem(loginOwnerStorageKey);
  if (isLoginOwner(saved)) return saved;
  const token = randomUUID();
  await AsyncStorage.setItem(loginOwnerStorageKey, token);
  return token;
}
