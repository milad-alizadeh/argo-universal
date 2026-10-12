import { randomUUID } from 'expo-crypto';
import { loginOwnerStorageKey, isLoginOwner } from './login-owner-token';
export async function loginOwner(): Promise<string> {
  const saved = sessionStorage.getItem(loginOwnerStorageKey);
  if (isLoginOwner(saved)) return saved;
  const token = randomUUID();
  sessionStorage.setItem(loginOwnerStorageKey, token);
  return token;
}
