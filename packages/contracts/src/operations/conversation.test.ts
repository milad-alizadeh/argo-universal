import { expect, it } from 'vitest';
import { operations } from './index';

it('lets an Agent hang up its own Conversation at the act tier', () => {
  expect(operations['conversation.hangUp'].tier).toBe('act');
  expect(operations['conversation.hangUp'].params.safeParse({}).success).toBe(
    true,
  );
});
