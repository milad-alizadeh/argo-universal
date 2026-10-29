import {
  ProjectInfo,
  RegistryAgentId,
  SessionListInput,
  SessionListOutput,
  SessionNewInput,
  SessionNewOutput,
} from '@repo/contracts';
import type { OperationId } from '@repo/contracts/operations';
import { startOwnServer } from '@repo/e2e/own-server';
import { pollUntil } from '@repo/process';
import { z } from 'zod';

// Gives a fresh fixture Server one real Session through the router's own contract schemas, so the perf seed clones only columns the Server wrote.
interface Procedure<Input extends z.ZodType, Output extends z.ZodType> {
  path: OperationId;
  input: Input;
  output: Output;
}

const procedures = {
  projects: {
    path: 'project.list',
    input: z.strictObject({}).default({}),
    output: z.array(ProjectInfo.pick({ id: true }).strip()),
  },
  agents: {
    path: 'agent.list',
    input: z.strictObject({}).default({}),
    output: z.array(RegistryAgentId.strip()),
  },
  sessions: {
    path: 'session.list',
    input: SessionListInput,
    output: SessionListOutput,
  },
  newSession: {
    path: 'session.new',
    input: SessionNewInput,
    output: SessionNewOutput,
  },
} as const;

async function answer<Output extends z.ZodType>(
  response: Response,
  output: Output,
): Promise<z.output<Output>> {
  if (!response.ok)
    throw new Error(
      `${response.url} answered ${response.status}: ${await response.text()}`,
    );
  const envelope = z.object({ result: z.object({ data: z.unknown() }) });

  return output.parse(envelope.parse(await response.json()).result.data);
}

const encodedInput = <Input extends z.ZodType>(
  input: Input,
  value: z.input<Input> | undefined,
): string => {
  const parsed = input.parse(value);

  return parsed === undefined
    ? ''
    : `?input=${encodeURIComponent(JSON.stringify(parsed))}`;
};

async function query<Input extends z.ZodType, Output extends z.ZodType>(
  httpUrl: string,
  { path, input, output }: Procedure<Input, Output>,
  value?: z.input<Input>,
): Promise<z.output<Output>> {
  const search = encodedInput(input, value);

  return answer(await fetch(`${httpUrl}/trpc/${path}${search}`), output);
}

async function mutate<Input extends z.ZodType, Output extends z.ZodType>(
  httpUrl: string,
  { path, input, output }: Procedure<Input, Output>,
  value: z.input<Input>,
): Promise<z.output<Output>> {
  const response = await fetch(`${httpUrl}/trpc/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input.parse(value)),
  });

  return answer(response, output);
}

async function firstProjectId(httpUrl: string): Promise<string> {
  const projectId = (await query(httpUrl, procedures.projects)).at(0)?.id;

  if (!projectId) throw new Error('The fixture Server has no Project');

  return projectId;
}

async function availableAgent(httpUrl: string): Promise<string> {
  const agents = await query(httpUrl, procedures.agents, {});
  const agent = agents[0];

  if (!agent) throw new Error('The fixture Server has no available Agent');

  return agent.id;
}

async function settled(httpUrl: string): Promise<true | undefined> {
  const { sessions } = await query(httpUrl, procedures.sessions, {
    archived: false,
  });

  const first = sessions.at(0);

  return first && first.status !== 'running' ? true : undefined;
}

async function startTemplateSession(httpUrl: string): Promise<void> {
  await mutate(httpUrl, procedures.newSession, {
    projectId: await firstProjectId(httpUrl),
    agent: await availableAgent(httpUrl),
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [{ type: 'text', text: 'Template Session' }],
  });
  await pollUntil(
    () => settled(httpUrl),
    'The template Session did not settle',
  );
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
