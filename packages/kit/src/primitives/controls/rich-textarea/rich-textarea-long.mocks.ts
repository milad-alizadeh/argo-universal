import { exampleLabel } from './rich-textarea-example.mocks';
import type { RichTextareaProps } from './rich-textarea-props';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

// As many results as an Agent's Slash commands can run to, so the menu scrolls far past its window.
export const longCommandCount = 100;

// Every command of the catalog carries a detail and the text choosing it inserts, so a test can read either.
type RecordedCommand = ComposerSuggestion & { detail: string; insert: string };

// What one row of the catalog reads as, and what choosing it inserts.
interface RecordedRow {
  name: string;
  insert: string;
}

export const longCommands: RecordedCommand[] = Array.from(
  { length: longCommandCount },
  (_, index) => ({
    id: `command-${index + 1}`,
    label: `/command-${index + 1}`,
    detail: `Command ${index + 1}`,
    icon: 'code',
    insert: `/command-${index + 1} `,
  }),
);

// Read from the recorded command rather than from the menu's own wording.
export function longCommand(index: number): RecordedRow {
  const command = longCommands[index];

  if (!command)
    throw new Error(
      `Recorded catalog needs ${longCommandCount} commands, each with a label, a detail and the text it inserts.`,
    );

  return { name: `${command.label} ${command.detail}`, insert: command.insert };
}

export const longSuggestionsRichTextarea = {
  value: '',
  accessibilityLabel: exampleLabel,
  suggestions: [
    {
      id: 'long',
      title: 'Suggestions',
      query: (): ComposerSuggestion[] => longCommands,
    },
  ],
} satisfies Omit<RichTextareaProps, 'onChangeText'>;
