export const loginOwnerStorageKey = 'agent-login-owner';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isLoginOwner = (saved: string | null): saved is string =>
  saved !== null && uuidPattern.test(saved);
