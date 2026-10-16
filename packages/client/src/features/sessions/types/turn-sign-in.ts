// A Session's sign-in for an `auth_required` Turn, kept across the Session page's mounts.
export interface TurnSignIn {
  // The Turn end whose Authenticate was pressed, until its sign-in finishes.
  authenticating: string | undefined;
  // The Turn end a finished sign-in answered, so its card stays cleared.
  answered: string | undefined;
}
