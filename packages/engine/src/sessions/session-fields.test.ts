import { worktreeName } from '@repo/git';
import { expect, it } from 'vitest';
import { toSessionCheckout } from './session-fields';

const id = 'e03c46d8-ed50-4766-9ef2-68a2bab11c32';
const name = worktreeName(id);

it.each([
  { branch: `argo/${name}`, path: `/w/p/${name}`, type: 'worktree' },
  { branch: `argo/${id}`, path: `/w/p/${id}`, type: 'worktree' },
])('reads a Session on its own branch as a worktree ($branch)', (row) => {
  expect(
    toSessionCheckout({ id, checkoutPath: row.path, checkoutBranch: row.branch })
      .type,
  ).toBe(row.type);
});

it.each([name, 'e03c46d8-other'])(
  "reads another Session's worktree %s as a starter Checkout",
  (owner) => {
    expect(
      toSessionCheckout({
        id: 'borrower',
        checkoutPath: `/w/p/${owner}`,
        checkoutBranch: `argo/${owner}`,
      }).type,
    ).toBe('starter');
  },
);
