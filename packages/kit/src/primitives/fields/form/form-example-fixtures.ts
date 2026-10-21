import type { ComponentProps } from 'react';
import type { IssueDraft, IssueForm } from './form-example';

type IssueFormFixture = Omit<
  ComponentProps<typeof IssueForm>,
  'onSubmit' | 'onCancel'
>;

const filled: IssueDraft = {
  title: 'Sign-in sheet closes early',
  description:
    'On Android the sheet closes before the code arrives, so the person has to start again.',
  due: '2026-10-19',
  labels: ['bug'],
};

export const filledIssueForm = { initial: filled } satisfies IssueFormFixture;

export const invalidIssueForm = {
  titleError: 'Enter a title.',
} satisfies IssueFormFixture;

export const submittingIssueForm = {
  loading: true,
  initial: filled,
} satisfies IssueFormFixture;
