import { expect, it } from 'vitest';
import { slashCommandSource } from './slash-command-suggestions';

const commands = [
  { name: 'inspect', description: 'Review changes' },
  { name: 'review', description: 'Review a file', hint: 'files' },
  { name: 'reset', description: 'Start again' },
];

it('offers name prefixes first, then descriptions, without duplicates', () => {
  const source = slashCommandSource(commands);

  expect(source.query('RE')).toEqual([
    {
      id: 'review',
      label: '/review',
      detail: 'Review a file',
      icon: 'code',
      insert: '/review ',
      command: 'review',
    },
    {
      id: 'reset',
      label: '/reset',
      detail: 'Start again',
      icon: 'code',
      insert: '/reset ',
      command: 'reset',
    },
    {
      id: 'inspect',
      label: '/inspect',
      detail: 'Review changes',
      icon: 'code',
      insert: '/inspect ',
      command: 'inspect',
    },
  ]);
});

it('states each Agent command with its hint, so a typed name is known at once', () => {
  expect(slashCommandSource(commands).commands).toEqual([
    { name: 'inspect' },
    { name: 'review', hint: 'files' },
    { name: 'reset' },
  ]);
});

it('keeps no commands and no match empty', () => {
  expect(slashCommandSource(commands).query('missing')).toEqual([]);
  expect(slashCommandSource(skillCommands).query('missing')).toEqual([]);
  expect(slashCommandSource([]).query('')).toEqual([]);
  expect(slashCommandSource([]).commands).toEqual([]);
});

const otherSkill = '$to-special';

const otherSkillLabel = '/$to-special';

const skillCommands = [
  { name: 'inspect', description: 'Turn to-spec into a plan' },
  { name: '$to-spec', description: 'Write a spec', hint: 'idea' },
  { name: 'to-spec', description: 'Ordinary to-spec command' },
  { name: otherSkill, description: 'Another workflow' },
];

it.each(['to-spec', '$to-spec', 'to-sp', '$TO-SP', 'TO-SPEC'])(
  'finds skills and ordinary commands by %s, keeping canonical identities and ranking',
  async (query) => {
    const results = await slashCommandSource(skillCommands).query(query);
    expect(results.slice(0, 3)).toEqual([
      {
        id: '$to-spec',
        label: '/$to-spec',
        detail: 'Write a spec',
        icon: 'code',
        insert: '/$to-spec ',
        command: '$to-spec',
      },
      {
        id: 'to-spec',
        label: '/to-spec',
        detail: 'Ordinary to-spec command',
        icon: 'code',
        insert: '/to-spec ',
        command: 'to-spec',
      },
      {
        id: otherSkill,
        label: otherSkillLabel,
        detail: 'Another workflow',
        icon: 'code',
        insert: '/$to-special ',
        command: otherSkill,
      },
    ]);
    expect(results.map(({ id }) => id)).toEqual(
      query.startsWith('$')
        ? ['$to-spec', 'to-spec', otherSkill]
        : ['$to-spec', 'to-spec', otherSkill, 'inspect'],
    );
  },
);

it('offers every canonical command in Agent order for an empty search', async () => {
  const source = slashCommandSource(skillCommands);
  expect((await source.query('')).map(({ label }) => label)).toEqual([
    '/inspect',
    '/$to-spec',
    '/to-spec',
    otherSkillLabel,
  ]);
});

it('keeps canonical skill names and hints in command recognition', () => {
  expect(slashCommandSource(skillCommands).commands).toEqual([
    { name: 'inspect' },
    { name: '$to-spec', hint: 'idea' },
    { name: 'to-spec' },
    { name: otherSkill },
  ]);
});

it('finds a skill by description', async () => {
  const source = slashCommandSource(skillCommands);
  expect((await source.query('workflow')).map(({ id }) => id)).toEqual([
    otherSkill,
  ]);
});
