import { describe, expect, it } from 'vitest';
import type {
  SessionHeaderProps,
  SessionPullRequest,
} from '#features/sessions';
import { headerWithPullRequests } from './with-session-pull-requests';

const change: SessionPullRequest = {
  stage: 'open',
  number: 12,
  title: 'Add the thing',
  mergeable: true,
};

const header: SessionHeaderProps = {
  title: 'Work',
  status: 'idle',
  startedAt: null,
};

describe('headerWithPullRequests', () => {
  it("puts the Plugins' Changes in the header props, where the Workbench and Inspector read them", () => {
    expect(headerWithPullRequests(header, [change])).toEqual({
      ...header,
      pullRequests: [change],
    });
  });

  it('leaves the header as it was when no Plugin supplied a Change', () => {
    expect(headerWithPullRequests(header, [])).toBe(header);
  });
});
