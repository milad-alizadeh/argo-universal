import type { Page, APIResponse } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';

type QueryInput<Output> = {
  page: Page;
  httpUrl: string;
  procedure: string;
  input: object;
  output: z.ZodType<Output>;
};

export async function query<Output>(
  input: QueryInput<Output>,
): Promise<Output> {
  const { page, httpUrl, procedure, output } = input;
  const encoded = encodeURIComponent(JSON.stringify(input.input));

  const response = await page.request.get(
    `${httpUrl}/trpc/${procedure}?input=${encoded}`,
    { maxRetries: 2 },
  );

  expect(response.ok()).toBe(true);

  return readOutput(response, output);
}

type MutationInput = Omit<QueryInput<unknown>, 'output'>;

// Calls a mutation over HTTP, as another client of the Server would.
export async function mutate(input: MutationInput): Promise<void> {
  await requestMutation(input);
}

async function readOutput<Output>(
  response: APIResponse,
  output: z.ZodType<Output>,
): Promise<Output> {
  return z
    .object({ result: z.object({ data: output }) })
    .parse(await response.json()).result.data;
}

export async function mutateWithResult<Output>(
  input: QueryInput<Output>,
): Promise<Output> {
  const response = await requestMutation(input);

  return readOutput(response, input.output);
}

async function requestMutation(input: MutationInput): Promise<APIResponse> {
  const response = await input.page.request.post(
    `${input.httpUrl}/trpc/${input.procedure}`,
    { data: input.input },
  );

  expect(response.ok()).toBe(true);

  return response;
}
