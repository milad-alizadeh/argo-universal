// A Plugin that prompts a Session when its Operation runs, as a Watch will.
export function register(argo) {
  argo.operations.register('prompt', ({ sessionId, text }) =>
    argo.sessions.prompt(sessionId, text),
  );
}
