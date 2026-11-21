import type { Page } from '@playwright/test';
import { z } from 'zod';
import { mutate, query } from './server-query';

const Projects = z.array(z.object({ id: z.string() }));

export async function firstProjectId(
  page: Page,
  httpUrl: string,
): Promise<string> {
  const [project] = await query({
    page,
    httpUrl,
    procedure: 'project.list',
    input: {},
    output: Projects,
  });

  if (!project) throw new Error('The Server has no Project');

  return project.id;
}

type SeededSession = { projectId: string; agent: string; title: string };

export async function seedSession(
  page: Page,
  httpUrl: string,
  session: SeededSession,
): Promise<void> {
  await mutate({
    page,
    httpUrl,
    procedure: 'session.new',
    input: {
      projectId: session.projectId,
      agent: session.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: session.title }],
    },
  });
}
