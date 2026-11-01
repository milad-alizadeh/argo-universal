import type { OperationId } from '@repo/contracts/operations';
import { z } from 'zod';
import { asTheApp } from './app-origin.mts';

/*
 * The Server's own tRPC procedures over HTTP, through the router's contract schemas.
 *
 * The seeds and the real-Agent scenarios talk to the Server the App talks to, so what they ask for
 * and read back is the same shape the product uses rather than a hand-written JSON body.
 *
 * Every request carries the App's Origin, because the Server admits a caller on the loopback door only
 * when it proves itself the way the App does (#1696).
 */
export interface Procedure<Input extends z.ZodType, Output extends z.ZodType> {
  path: OperationId;
  input: Input;
  output: Output;
}

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

export async function query<Input extends z.ZodType, Output extends z.ZodType>(
  httpUrl: string,
  { path, input, output }: Procedure<Input, Output>,
  value?: z.input<Input>,
): Promise<z.output<Output>> {
  const search = encodedInput(input, value);

  return answer(
    await fetch(`${httpUrl}/trpc/${path}${search}`, { headers: asTheApp }),
    output,
  );
}

export async function mutate<Input extends z.ZodType, Output extends z.ZodType>(
  httpUrl: string,
  { path, input, output }: Procedure<Input, Output>,
  value: z.input<Input>,
): Promise<z.output<Output>> {
  const response = await fetch(`${httpUrl}/trpc/${path}`, {
    method: 'POST',
    headers: { ...asTheApp, 'content-type': 'application/json' },
    body: JSON.stringify(input.parse(value)),
  });

  return answer(response, output);
}
