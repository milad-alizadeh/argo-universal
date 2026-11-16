import type {
  TokenLabel,
  TokenPasteArgo,
} from '@repo/contracts/plugins/token-paste-api';
import { expect, it, vi } from 'vitest';
import { tokenPaste } from './token-paste';

// A Plugin's calls that add and keep nothing a refused token could reach.
const argo: TokenPasteArgo = {
  changed: vi.fn<() => void>(),
  accounts: {
    add: vi.fn<() => Promise<string>>(() => Promise.resolve('account')),
    provide: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  },
  secrets: {
    get: vi.fn<() => Promise<string | null>>(() => Promise.resolve(null)),
    set: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  },
};

const token = 'token-unscoped';

const pasteAnswered = (answer: TokenLabel): ReturnType<typeof tokenPaste> =>
  tokenPaste(argo, {
    host: 'api.service.example',
    header: { header: 'Authorization', prefix: '' },
    label: () => Promise.resolve(answer),
  });

const notAccepted = 'This token wasn’t accepted. Check it and paste it again.';

it.each([
  {
    answer: { refused: 'This token has no scopes. Make one with scopes.' },
    message: 'This token has no scopes. Make one with scopes.',
  },
  { answer: null, message: notAccepted },
  { answer: { refused: '' }, message: notAccepted },
  { answer: { refused: `Refused ${token}` }, message: notAccepted },
])(
  'draws $message beside the field for a label answering $answer',
  async ({ answer, message }) => {
    const flow = pasteAnswered(answer);

    expect(await flow.start(token)).toEqual({
      kind: 'failed',
      reason: 'rejected',
      message,
    });
    expect(argo.accounts.add).not.toHaveBeenCalled();
    expect(argo.secrets.set).not.toHaveBeenCalled();
  },
);
