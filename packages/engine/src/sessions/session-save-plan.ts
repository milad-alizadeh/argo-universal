import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  SessionSavePlanInput,
  SessionSavePlanOutput,
} from '@repo/contracts';
import type { OpenSessions } from './open-sessions';
import { requireWritableSession } from './session-command';

// Argo only: plans go under `.argo/plans` in the Session's Checkout.
const savedPlansDirectory = join('.argo', 'plans');

const fallbackName = 'plan';

const maxNameLength = 60;

const headingText = (line: string): string | undefined => {
  const text = line.replace(/^#{1,6} /, '');

  return text === line ? undefined : text;
};

// Lowercase letters and digits, every other run of characters one dash.
const slug = (text: string): string =>
  text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .join('-')
    .slice(0, maxNameLength);

// The plan's first heading as a file name.
function planFileName(plan: string): string {
  const heading = plan.split('\n').map(headingText).find(Boolean) ?? '';
  const name = slug(heading).split('-').filter(Boolean).join('-');

  return name || fallbackName;
}

interface PlanFile {
  directory: string;
  name: string;
  plan: string;
}

const fileName = (name: string, attempt: number): string =>
  attempt === 1 ? `${name}.md` : `${name}-${attempt}.md`;

// Never overwrites: a name already taken gets the next free number.
async function writeNewFile(file: PlanFile, attempt = 1): Promise<string> {
  const name = fileName(file.name, attempt);

  const written = await writeFile(join(file.directory, name), file.plan, {
    flag: 'wx',
  }).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'EEXIST') return false;

      throw error;
    },
  );

  return written ? name : writeNewFile(file, attempt + 1);
}

// Reads the Session as a Session caller's scope does, with the Writer's queued rows.
export async function saveSessionPlan(
  open: OpenSessions,
  input: SessionSavePlanInput,
): Promise<SessionSavePlanOutput> {
  const session = requireWritableSession(open.queued(input.sessionId));

  const directory = join(session.checkout.path, savedPlansDirectory);

  await mkdir(directory, { recursive: true });

  const name = planFileName(input.plan);
  const file = await writeNewFile({ directory, name, plan: input.plan });

  return { path: join(savedPlansDirectory, file) };
}
