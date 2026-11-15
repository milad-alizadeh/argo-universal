import {
  argoSlashCommands,
  type SessionPromptInput,
  type SessionRestart,
} from '@repo/contracts';

type Prompt = SessionPromptInput['prompt'];

const soleBlock = (prompt: Prompt): Prompt[number] | undefined =>
  prompt.length === 1 ? prompt[0] : undefined;

// The text of a Prompt that is one text block and nothing else.
const soleText = (prompt: Prompt): string | undefined => {
  const block = soleBlock(prompt);

  return block?.type === 'text' ? block.text.trim() : undefined;
};

// The restart a Prompt names: an Argo Slash command alone, with no argument after it.
export const namedRestart = (prompt: Prompt): SessionRestart | undefined => {
  const text = soleText(prompt);

  return argoSlashCommands.find(({ name }) => text === `/${name}`)?.name;
};
