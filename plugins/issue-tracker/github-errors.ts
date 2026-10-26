// What a person reads when gh fails: a fix for the common causes, else gh's own words.
const githubErrorMessages: [RegExp, string][] = [
  [/not found|enoent|no such file/i, 'GitHub CLI (gh) is not installed.'],
  [
    /not logged in|not authenticated|authentication failed|run gh auth login/i,
    'Sign in to GitHub with gh auth login.',
  ],
];

export const githubError = (cause: unknown): string => {
  const detail = errorDetail(cause);

  return matchingErrorMessage(detail) ?? detail;
};

function errorDetail(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function matchingErrorMessage(detail: string): string | undefined {
  return githubErrorMessages.find(([pattern]) => pattern.test(detail))?.[1];
}
