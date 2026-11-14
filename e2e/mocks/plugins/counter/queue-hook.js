const queuedHookText = 'Rewrite this queued Prompt';

const dispatchedHookText = 'Hook ran before this Turn';

export function registerQueueHook(argo) {
  argo.on('prompt.submit', queuePromptHook);
}

function queuePromptHook(_context, event, next) {
  return next({ ...event, prompt: event.prompt.map(rewriteBlock) });
}

function rewriteBlock(block) {
  return block.type === 'text' && block.text === queuedHookText
    ? { ...block, text: dispatchedHookText }
    : block;
}
