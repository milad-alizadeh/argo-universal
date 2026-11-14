import type { AgentServerEnvironment } from '@repo/contracts';

type Variable = readonly [name: string, value: string];

export type LineChange =
  | { saved: true; env: AgentServerEnvironment }
  | { saved: false; error: string };

export const environmentLine = (name: string, value: string): string =>
  `${name}=${value}`;

// A name the shell would take before `=`, and one a plain record can hold.
const unusableName = /[\s=]|^$|^__proto__$/;

// Everything after the first `=` is the value, so a value may hold one.
function parseLine(text: string): Variable | undefined {
  const at = text.indexOf('=');
  const name = text.slice(0, Math.max(at, 0)).trim();

  return unusableName.test(name) ? undefined : [name, text.slice(at + 1)];
}

const invalidLine: LineChange = {
  saved: false,
  error: 'Write a variable as NAME=value, with no spaces in the name.',
};

const duplicate = (name: string): LineChange => ({
  saved: false,
  error: `${name} is already set; change its own line.`,
});

const without = (
  env: AgentServerEnvironment,
  name: string | undefined,
): Variable[] => Object.entries(env).filter(([key]) => key !== name);

// The environment with `edited` written in the place of the line it replaces; a new line goes last.
function withLine(
  env: AgentServerEnvironment,
  current: string | undefined,
  edited: Variable,
): AgentServerEnvironment {
  const entries = Object.entries(env).map((entry): Variable =>
    entry[0] === current ? edited : entry,
  );

  return Object.fromEntries(
    current === undefined ? [...entries, edited] : entries,
  );
}

/*
 * What one line's text does to the environment when its field loses focus: `current` is the variable the line
 * showed, or undefined for the empty last line. An emptied line removes its variable.
 */
export function changeLine(
  env: AgentServerEnvironment,
  current: string | undefined,
  text: string,
): LineChange {
  if (text.trim() === '')
    return { saved: true, env: Object.fromEntries(without(env, current)) };

  const edited = parseLine(text);

  return edited ? editedLine(env, current, edited) : invalidLine;
}

function editedLine(
  env: AgentServerEnvironment,
  current: string | undefined,
  edited: Variable,
): LineChange {
  return without(env, current).some(([name]) => name === edited[0])
    ? duplicate(edited[0])
    : { saved: true, env: withLine(env, current, edited) };
}
