import {
  type StoryPlan,
  type StoryEntry,
  storyEntries,
} from './new-story-model.mts';
import type { Prop } from './new-story-props.mts';

const quote = (value: string): string => `'${value}'`;

const placeholders: Partial<Record<Prop['kind'], string>> = {
  text: quote('Label'),
  number: '1',
  boolean: 'false',
  handler: 'fn()',
};

const firstOption = (prop: Prop): string | undefined => {
  const first = prop.options?.[0];

  return first === undefined ? undefined : quote(first);
};

const argValue = (prop: Prop): string | undefined =>
  prop.kind === 'choice' ? firstOption(prop) : placeholders[prop.kind];

// Required props take a placeholder, so every story type-checks; the rest stay args for Controls.
function metaArgs(props: Prop[]): string {
  const lines = props
    .filter((prop) => prop.required)
    .flatMap((prop): string[] => {
      const value = argValue(prop);

      return value === undefined ? [] : [`${prop.name}: ${value},`];
    });

  return lines.length === 0 ? '' : `  args: { ${lines.join(' ')} },\n`;
}

const literal = (value: string | boolean): string =>
  typeof value === 'boolean' ? String(value) : quote(value);

const storySource = (entry: StoryEntry): string => {
  const args = Object.entries(entry.args)
    .map(([key, value]) => `${key}: ${literal(value)}`)
    .join(', ');

  return `export const ${entry.name}: Story = { args: { ${args} } };\n`;
};

const controls: Record<Prop['kind'], string> = {
  text: "{ control: 'text' }",
  number: "{ control: 'number' }",
  boolean: "{ control: 'boolean' }",
  handler: '{ control: false }',
  choice: "{ control: 'select' }",
  opaque: '{ control: false }',
};

function control(prop: Prop): string {
  if (prop.kind !== 'choice') return controls[prop.kind];

  const options = (prop.options ?? []).map(quote).join(', ');

  return `{ control: 'select', options: [${options}] }`;
}

function argTypesSource(plan: StoryPlan): string {
  if (plan.kitComponent !== undefined)
    return `  argTypes: kitArgTypes(${quote(plan.kitComponent)}),\n`;

  const lines = plan.props.map((prop) => `    ${prop.name}: ${control(prop)},`);

  return lines.length === 0 ? '' : `  argTypes: {\n${lines.join('\n')}\n  },\n`;
}

const handlerImport = (plan: StoryPlan): string =>
  metaArgs(plan.props).includes('fn()')
    ? "import { fn } from 'storybook/test';\n"
    : '';

const kitImport = (plan: StoryPlan): string =>
  plan.kitComponent === undefined
    ? ''
    : "import { kitArgTypes } from '#kit/kit-arg-types';\n";

const metaSource = (plan: StoryPlan): string =>
  [
    'const meta = {\n',
    `  title: ${quote(plan.title)},\n`,
    `  component: ${plan.component},\n`,
    metaArgs(plan.props),
    argTypesSource(plan),
    `} satisfies Meta<typeof ${plan.component}>;\n\n`,
  ].join('');

// A branch-less component gets one `Default` story, so the file always has a state to show.
export function renderStory(plan: StoryPlan): string {
  const body = storyBody(plan);

  return [
    "import type { Meta, StoryObj } from '@storybook/react-native-web-vite';\n",
    handlerImport(plan),
    kitImport(plan),
    `import { ${plan.component} } from ${quote(plan.importPath)};\n\n`,
    metaSource(plan),
    'export default meta;\n\n',
    'type Story = StoryObj<typeof meta>;\n\n',
    body,
  ].join('');
}

function storyBody(plan: StoryPlan): string {
  const declared = new Set(plan.props.map((prop) => prop.name));

  const stories = storyEntries(
    plan.branches,
    declared.size === 0 ? undefined : declared,
  );

  const body =
    stories.length === 0
      ? ['export const Default: Story = {};\n']
      : stories.map(storySource);

  return body.join('\n');
}
