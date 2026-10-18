import { z } from 'zod';

type Props = z.ZodObject['shape'];

interface KeyboardInput {
  summary: string;
  schema: z.ZodObject;
  container: boolean;
}

const knownRoles = [
  [/group of buttons/, 'group'],
  [/split button/, 'split button'],
  [/primary action with a secondary action/, 'split button'],
  [/actions offered/, 'menu'],
  [/action list/, 'menu'],
  [/list row/, 'list item'],
  [/search input|text input/, 'text field'],
  [/date picker/, 'picker'],
  [/numeric range/, 'slider'],
  [/binary or mixed selection/, 'checkbox'],
  [/binary selection/, 'checkbox'],
  [/on\/off control/, 'switch'],
  [/selection control/, 'picker'],
  [/filter chip/, 'button'],
  [/disclosure/, 'disclosure'],
  [/link/, 'link'],
  [/avatar|native symbol/, 'image'],
  [/status mark/, 'status'],
  [/progress indicator/, 'progress indicator'],
  [/keyboard shortcut/, 'shortcut'],
  [/audio|video player/, 'media player'],
  [/form/, 'form'],
  [/field/, 'group'],
  [/combobox/, 'combobox'],
  [/searchable picker/, 'combobox'],
  [/grid/, 'grid'],
  [/alert/, 'alert dialog'],
  [/dialog/, 'dialog'],
  [/menu/, 'menu'],
  [/toast/, 'status'],
  [/tooltip/, 'tooltip'],
  [/table/, 'table'],
  [/scroll container/, 'scroll view'],
  [/page/, 'main'],
  [/list/, 'list'],
  [/image/, 'image'],
  [/text/, 'text'],
  [/button/, 'button'],
  [/switch/, 'switch'],
  [/checkbox/, 'checkbox'],
  [/slider/, 'slider'],
  [/input/, 'text field'],
  [/menu/, 'menu'],
  [/dialog/, 'dialog'],
  [/progress/, 'progress indicator'],
  [/chart/, 'chart'],
  [/surface/, 'surface'],
  [/card/, 'card'],
] as const;

const keyboardByRole = {
  button:
    'Keyboard focus reaches the button in platform order; Enter or Space activates it.',
  link: 'Keyboard focus reaches the link in platform order; Enter opens its destination.',
  checkbox:
    'Keyboard focus reaches the checkbox in platform order; Space changes its checked state.',
  switch:
    'Keyboard focus reaches the switch in platform order; Space changes its on or off state.',
  'text field':
    'Keyboard focus reaches the text field in platform order; typing edits its value.',
  slider:
    'Keyboard focus reaches the slider in platform order; arrow keys adjust its value.',
  picker:
    'Keyboard focus reaches the picker in platform order; platform picker keys change the selected option.',
  combobox:
    'Keyboard focus reaches the combobox in platform order; typing filters options and arrow keys move through matches.',
  grid: 'Arrow keys move between grid cells; Tab moves focus into and out of the grid.',
  menu: 'Arrow keys move between menu actions; Enter activates an action and Escape closes the menu.',
  dialog:
    'Focus remains within the dialog until it closes; Escape closes it when the dialog allows dismissal.',
  'split button':
    'Keyboard focus reaches the primary action; Enter or Space runs it, and the menu control opens the secondary actions.',
  'alert dialog':
    'Focus enters the alert dialog; its actions are reached in platform order and Escape does not dismiss it.',
  disclosure:
    'Keyboard focus reaches the disclosure in platform order; Enter or Space changes its expanded state.',
} satisfies Record<string, string>;

export function partRole(summary: string, properties: Props): string {
  const lower = summary.toLowerCase();
  const role = knownRoles.find(([pattern]) => pattern.test(lower))?.[1];

  return resolveRole(role, properties);
}

function resolveRole(role: string | undefined, properties: Props): string {
  return pressableRole(role, properties) ?? fallbackRole(properties);
}

function pressableRole(
  role: string | undefined,
  properties: Props,
): string | undefined {
  if (role === 'surface' || role === 'card') return fallbackRole(properties);

  return role;
}

function fallbackRole(properties: Props): string {
  return 'onPress' in properties ? 'button' : 'native';
}

function eventsOf(properties: Props): string[] {
  return Object.keys(properties).filter((name) => name.startsWith('on'));
}

function eventNote(behavior: string, events: string[]): string {
  return events.length
    ? `${behavior} Changes dispatch ${events.join(', ')}.`
    : behavior;
}

function keyboardForRole(role: string): string | undefined {
  return Object.entries(keyboardByRole).find(([name]) => name === role)?.[1];
}

function staticKeyboardBehavior(container: boolean): string {
  if (container)
    return 'The container adds no keyboard focus stop; navigation reaches its child controls.';

  return 'This static part adds no keyboard focus stop or shortcut.';
}

function keyboardWithoutRole(
  role: string,
  events: string[],
  input: KeyboardInput,
): string {
  const edits = events.filter((event) =>
    ['onChangeText', 'onChange', 'onValueChange'].includes(event),
  );

  if (edits.length)
    return `Keyboard focus reaches this ${role} in platform order; edits change the value.`;

  return staticKeyboardBehavior(input.container);
}

export function partKeyboardBehavior(input: KeyboardInput): string {
  const properties = input.schema.shape;
  const events = eventsOf(properties);
  const role = partRole(input.summary, properties);
  const roleBehavior = keyboardForRole(role);

  if (roleBehavior) return eventNote(roleBehavior, events);

  return keyboardWithoutRole(role, events, input);
}
