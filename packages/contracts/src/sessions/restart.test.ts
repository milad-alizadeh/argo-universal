import { expect, it } from 'vitest';
import { withArgoSlashCommands } from './restart';

const names = (
  commands: Parameters<typeof withArgoSlashCommands>[0],
): string[] => withArgoSlashCommands(commands).map(({ name }) => name);

const review = { name: 'review', description: 'Review changes' };

it('offers Argo’s Slash commands after the Agent’s', () => {
  expect(names([review])).toEqual(['review', 'clear', 'reload']);
});

it('offers Argo’s Slash commands before the Agent has reported any', () => {
  expect(names(null)).toEqual(['clear', 'reload']);
});

it('keeps the Agent’s own command and leaves out Argo’s of the same name', () => {
  const own = { name: 'clear', description: 'The Agent’s own clear' };

  expect(withArgoSlashCommands([own, review])).toEqual([
    own,
    review,
    expect.objectContaining({ name: 'reload' }),
  ]);
});
