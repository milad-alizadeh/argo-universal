import { describe, expect, it } from 'vitest';
import {
  firstProject,
  image,
  secondProject,
} from '../../../../mocks/composer-attachment-draft-mock';
import { keptAttachments } from './kept-attachments';

const file = new Blob(['first']);

describe('kept Attachments', () => {
  it("gives back the Attachments and files kept for one owner's draft only", () => {
    keptAttachments.keep(
      firstProject,
      [image('first')],
      new Map([['first', file]]),
    );

    expect(keptAttachments.load(firstProject).attachments).toEqual([
      image('first'),
    ]);
    expect(keptAttachments.load(firstProject).files.get('first')).toBe(file);
    expect(keptAttachments.load(secondProject).attachments).toEqual([]);
  });

  it('forgets them once the draft has none', () => {
    keptAttachments.keep(
      firstProject,
      [image('first')],
      new Map([['first', file]]),
    );
    keptAttachments.keep(firstProject, [], new Map());

    expect(keptAttachments.load(firstProject).attachments).toEqual([]);
    expect(keptAttachments.load(firstProject).files.size).toBe(0);
  });

  it('forgets the Attachments that were sent, and keeps ones changed since', () => {
    const files = new Map([['first', file]]);
    keptAttachments.keep(firstProject, [image('first')], files);
    keptAttachments.keep(secondProject, [image('newer')], files);

    keptAttachments.forgetSent(firstProject, [image('first')]);
    keptAttachments.forgetSent(secondProject, [image('first')]);

    expect(keptAttachments.load(firstProject).attachments).toEqual([]);
    expect(keptAttachments.load(secondProject).attachments).toEqual([
      image('newer'),
    ]);
    keptAttachments.keep(secondProject, [], new Map());
  });
});
