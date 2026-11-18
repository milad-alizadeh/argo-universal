// A Plugin that prompts a Session, and takes back a Prompt it queued, when its Operations run, as a Watch will.
export function register(argo) {
  argo.operations.register('prompt', ({ sessionId, text }) =>
    argo.sessions.prompt(sessionId, text),
  );
  argo.operations.register('withdraw', ({ sessionId, queuedId }) =>
    argo.sessions.withdraw(sessionId, queuedId),
  );
}
