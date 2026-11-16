// What the sign-in page says of "Sign in with Atlassian"; its tests read the same words.
export const atlassianWords = {
  section: 'Or sign in with Atlassian',
  start: 'Sign in with Atlassian',
  cancel: 'Cancel signing in',
  needsApp:
    'Set your Atlassian OAuth app’s client ID and secret in Settings › Plugins › Jira to sign in with Atlassian instead.',
  elsewhere:
    'Signing in with Atlassian opens a browser on the Server Device: open Jira in Argo there, or paste a token here.',
  waiting: 'Finish signing in in your browser. Waiting for Atlassian…',
  offer: 'Opens Atlassian in your browser, with your Atlassian OAuth app.',
} as const;
