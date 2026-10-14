import { randomUUID } from 'expo-crypto';
import { loginOwnerStorageKey, isLoginOwner } from './login-owner-token';

let ownerPromise: Promise<string> | undefined;

export const loginOwner = (): Promise<string> => (ownerPromise ??= loadOwner());

export function initializeLoginOwner(): void {
  if (typeof window === 'undefined') return;
  void loginOwner().catch((cause: unknown) => {
    console.error('Could not initialize Agent sign-in ownership', cause);
  });
}

async function loadOwner(): Promise<string> {
  if (!navigator.locks) return saveOwner(randomUUID());

  return claimOwner(reloadOwner());
}

function reloadOwner(): string {
  if (!isReload()) return saveOwner(randomUUID());
  const saved = sessionStorage.getItem(loginOwnerStorageKey);

  return isLoginOwner(saved) ? saved : randomUUID();
}

function isReload(): boolean {
  const navigation = performance.getEntriesByType('navigation')[0];

  return (
    navigation instanceof PerformanceNavigationTiming &&
    navigation.type === 'reload'
  );
}

function claimOwner(token: string): Promise<string> {
  return new Promise((resolve) => {
    void navigator.locks
      .request(
        `${loginOwnerStorageKey}:${token}`,
        { ifAvailable: true },
        (lock) => holdOwnerLock({ lock, token, resolve }),
      )
      .catch(() => resolve(randomUUID()));
  });
}

type OwnerClaim = {
  lock: Lock | null;
  token: string;
  resolve: (owner: string | PromiseLike<string>) => void;
};

function holdOwnerLock({
  lock,
  token,
  resolve,
}: OwnerClaim): Promise<void> | undefined {
  if (!lock) {
    resolve(claimOwner(randomUUID()));

    return;
  }

  resolve(saveOwner(token));

  return new Promise<void>(() => {});
}

function saveOwner(token: string): string {
  sessionStorage.setItem(loginOwnerStorageKey, token);

  return token;
}
