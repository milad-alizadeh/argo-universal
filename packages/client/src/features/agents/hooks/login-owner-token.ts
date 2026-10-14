import { AgentLoginStart } from '@repo/contracts';

export const loginOwnerStorageKey = 'agent-login-owner';

export const isLoginOwner = (saved: string | null): saved is string =>
  AgentLoginStart.shape.ownerToken.safeParse(saved).success;
