export function register(argo) {
  if (!Object.isFrozen(argo)) throw new Error('argo must be frozen');

  if (globalThis.registered) throw new Error('register called twice');
  globalThis.registered = true;
}
