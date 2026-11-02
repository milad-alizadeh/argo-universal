import { beforeEach, describe, expect, it, vi } from 'vitest';
import { image } from '../../../../mocks/composer-attachment-draft-mock';
import { memoryStorage } from '../../../../mocks/memory-storage';
import type { ComposerDraft } from '../components/composer/composer';
import { draftKey } from '../utils/draft-key';
import { forgetSentDraft } from './forget-sent-draft';
import { keptAttachments } from './kept-attachments';
import { keptDrafts } from './kept-draft';

const key = draftKey({ type: 'new-session', projectId: 'project-a' });

const sent = { text: 'Ship on Friday', attachments: [image('sent')] };

const newerText = 'Ship on Monday';

const keepDraft = (text: string, attachmentId: string): void => {
  keptDrafts.keep(key, text);
  keptAttachments.keep(key, [image(attachmentId)], new Map());
};

const keptDraft = async (): Promise<ComposerDraft> => ({
  text: await keptDrafts.load(key),
  attachments: keptAttachments.load(key).attachments,
});

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
  keptAttachments.keep(key, [], new Map());
});

describe('forgetting a sent draft', () => {
  it('forgets its text and Attachments while they are as sent', async () => {
    keepDraft(sent.text, 'sent');
    await forgetSentDraft(key, sent);
    expect(await keptDraft()).toEqual({ text: '', attachments: [] });
  });

  it('forgets Attachments sent with no text', async () => {
    keptAttachments.keep(key, [image('sent')], new Map());
    await forgetSentDraft(key, { text: '', attachments: [image('sent')] });
    expect(await keptDraft()).toEqual({ text: '', attachments: [] });
  });

  it('keeps the whole draft when its text changed', async () => {
    keepDraft(newerText, 'sent');
    await forgetSentDraft(key, sent);
    expect(await keptDraft()).toEqual({
      text: newerText,
      attachments: [image('sent')],
    });
  });

  it('keeps the whole draft when its Attachments changed', async () => {
    keepDraft(sent.text, 'newer');
    await forgetSentDraft(key, sent);
    expect(await keptDraft()).toEqual({
      text: sent.text,
      attachments: [image('newer')],
    });
  });
});
