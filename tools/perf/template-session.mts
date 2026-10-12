import { z } from 'zod';
import { startOwnServer } from '../../e2e/own-server.ts';

// Gives a fresh fixture Server one real Session, so the perf seed clones only columns the Server wrote.
const settleMilliseconds = 30_000;

async function query<T>(url: string, data: z.ZodType<T>): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return z.object({ result: z.object({ data }) }).parse(await response.json())
    .result.data;
}

async function mutate(url: string, body: object): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${url} answered ${response.status}: ${await response.text()}`,
    );
}

const firstProject = async (httpUrl: string): Promise<string | undefined> =>
  (
    await query(
      `${httpUrl}/trpc/projects.list`,
      z.array(z.looseObject({ id: z.string() })),
    )
  ).at(0)?.id;

const availableAgent = async (httpUrl: string): Promise<string | undefined> =>
  (
    await query(
      `${httpUrl}/trpc/agents.list`,
      z.array(z.looseObject({ agent: z.string(), availability: z.string() })),
    )
  ).find((entry) => entry.availability === 'available')?.agent;

async function projectAndAgent(
  httpUrl: string,
): Promise<{ projectId: string; agent: string }> {
  const projectId = await firstProject(httpUrl);
  const agent = await availableAgent(httpUrl);
  if (!projectId || !agent)
    throw new Error('The fixture Server has no Project or Agent');
  return { projectId, agent };
}

async function settled(httpUrl: string): Promise<boolean> {
  const { sessions } = await query(
    `${httpUrl}/trpc/session.list?input=${encodeURIComponent('{"archived":false}')}`,
    z.looseObject({
      sessions: z.array(z.looseObject({ status: z.string().optional() })),
    }),
  );
  return sessions.length > 0 && sessions[0]?.status !== 'running';
}

async function startTemplateSession(httpUrl: string): Promise<void> {
  await mutate(`${httpUrl}/trpc/session.new`, {
    ...(await projectAndAgent(httpUrl)),
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [{ type: 'text', text: 'Template Session' }],
  });
  const deadline = Date.now() + settleMilliseconds;
  while (!(await settled(httpUrl)))
    if (Date.now() > deadline)
      throw new Error('The template Session did not settle');
    else await new Promise((resolve) => setTimeout(resolve, 200));
}

// Starts a fixture Server in `directory`, runs one Session to its end, and stops the Server.
export async function withTemplateSession(directory: string): Promise<void> {
  const server = await startOwnServer(directory, {});
  try {
    await startTemplateSession(server.httpUrl);
  } finally {
    await server.stop();
  }
}
