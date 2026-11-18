// What the Feed tells the person when a Session's Agent never started `argo mcp` (ADR-0053); the Engine sends it, and stories draw it.
export const argoToolsNoticeTitle = "This Agent didn't load Argo's tools";

const adapterHint = 'Its ACP adapter may not support MCP servers.';

// Without the checklist the person has nothing to miss but Operations, so the description names only what they lose.
export const argoToolsNoticeDescription = (todoList: boolean): string =>
  todoList
    ? `It can't keep a Todo list or run Argo Operations in this Session. ${adapterHint}`
    : `It can't run Argo Operations in this Session. ${adapterHint}`;
