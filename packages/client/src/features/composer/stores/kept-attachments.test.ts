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
});
