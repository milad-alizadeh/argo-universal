// What the sign-in page says of "Sign in with Atlassian"; its tests read the same words.
export const atlassianWords = {
  start: 'Sign in with Atlassian',
  needsApp:
    'To sign in with Atlassian instead, set your Atlassian OAuth app’s client ID and secret in Settings › Plugins › Jira.',
  elsewhere:
    'To sign in with Atlassian, open Jira in Argo on the Server Device. Or paste a token here.',
  waiting: 'Finish signing in in your browser. Waiting for Atlassian…',
  offer: 'Or sign in with your Atlassian OAuth app.',
} as const;
