// Why a pasted token was not used, drawn beside the field; the tests read them too.
export const notices = {
  email:
    'Enter the email of your Atlassian account, then paste the token again.',
  site: 'Enter your Jira site, such as your-team.atlassian.net, then paste the token again.',
  noSite: (host: string) =>
    `Couldn’t find a Jira site at ${host}. Check its address, then paste the token again.`,
  unscoped:
    'This is an API token without scopes, which Argo doesn’t accept. Create an API token with scopes for Jira, then paste it here.',
  gone: 'This Project has no Jira sign-in. Paste a token to sign in again.',
  refused:
    'Atlassian didn’t accept this email and token. Check both, then paste the token again.',
} as const;
