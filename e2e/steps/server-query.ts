import type { Page } from '@playwright/test';
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
  return z
    .object({ result: z.object({ data: output }) })
    .parse(await response.json()).result.data;
}
