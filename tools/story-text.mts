// The story file `pnpm new:story` writes: the template of `docs/agents/storybook-template.md`, filled from the component.
import type { ArgSeed, StoryDraft, StoryPlan } from './story-draft.mts';
import type { PropDomain } from './story-props.mts';

export interface DraftText {
  readonly draft: StoryDraft;
  // How a story file in this repo imports `kitArgTypes`; it changes with the kit's package move in #1210.
  readonly kitArgTypesFrom: string;
  readonly componentFrom: string;
}

const CONTROLS = new Map([
  ['boolean', "{ control: 'boolean' }"],
  ['text', "{ control: 'text' }"],
  ['number', "{ control: 'number' }"],
]);

const quoted = (values: readonly string[]): string =>
  values.map((value): string => `'${value}'`).join(', ');

const control = (prop: PropDomain): string =>
  prop.values.length > 0
    ? `{ control: 'select', options: [${quoted(prop.values)}] }`
    : (CONTROLS.get(prop.kind) ?? '{}');

const NOTE_BREAK = '\n\n';

const literalArgTypes = (controls: readonly PropDomain[]): string =>
  controls
    .map((prop): string => `    ${prop.name}: ${control(prop)},`)
    .join('\n');

const argTypesLine = ({ draft }: DraftText): string =>
  draft.kitPart === undefined
    ? `  argTypes: {\n${literalArgTypes(draft.controls)}\n  },`
    : `  argTypes: kitArgTypes('${draft.kitPart}'),`;

const argPairs = (args: readonly ArgSeed[]): string =>
  args.map((arg): string => `${arg.name}: ${arg.literal}`).join(', ');

const argsLine = (args: readonly ArgSeed[]): string =>
  args.length === 0 ? '' : `\n  args: { ${argPairs(args)} },`;

const imports = ({
  draft,
  kitArgTypesFrom,
  componentFrom,
}: DraftText): string[] => [
  "import type { Meta, StoryObj } from '@storybook/react-native-web-vite';",
  ...(draft.kitPart === undefined
    ? []
    : [`import { kitArgTypes } from '${kitArgTypesFrom}';`]),
  `import { ${draft.component} } from '${componentFrom}';`,
];

const story = (plan: StoryPlan): string =>
  `export const ${plan.name}: Story = { args: { ${plan.prop}: ${plan.literal} } };`;

const NOTE =
  '// One story per branch, never per combination: a pair earns a story only where the component has a rule for the pair (ADR-0040).';

const stories = (plans: readonly StoryPlan[]): string[] =>
  plans.length === 0
    ? []
    : [[NOTE, plans.map(story).join(NOTE_BREAK)].join('\n')];

const metaBlock = (input: DraftText): string =>
  [
    'const meta = {',
    `  title: '${input.draft.title}',`,
    `  component: ${input.draft.component},${argsLine(input.draft.args)}`,
    argTypesLine(input),
    `} satisfies Meta<typeof ${input.draft.component}>;`,
  ].join('\n');

// The file an agent then edits: it names the states, it never invents a prop value.
export function storyText(input: DraftText): string {
  const blocks = [
    imports(input).join('\n'),
    metaBlock(input),
    'export default meta;',
    'type Story = StoryObj<typeof meta>;',
    ...stories(input.draft.stories),
  ];

  return `${blocks.join('\n\n')}\n`;
}
