import { z } from 'zod';

// A call the typed caller cannot make, such as input its procedure's schema refuses, sent as the App's HTTP client would.
export interface RawProcedureCall {
  path: string;
  type: 'query' | 'mutation';
  // The input as JSON text.
  input: string;
}

// A tRPC error as the HTTP transport encodes it.
const ProcedureFailure = z.object({
  error: z.object({ data: z.object({ code: z.string() }) }),
});

const procedureRequest = (url: string, call: RawProcedureCall): Request =>
  call.type === 'query'
    ? new Request(
        `${url}/trpc/${call.path}?input=${encodeURIComponent(call.input)}`,
      )
    : new Request(`${url}/trpc/${call.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: call.input,
      });

// The tRPC error code the real HTTP transport answers the call with.
export const rejectedProcedureCode = async (
  url: string,
  call: RawProcedureCall,
): Promise<string> => {
  const response = await fetch(procedureRequest(url, call));

  return ProcedureFailure.parse(await response.json()).error.data.code;
};

// A yes-or-no answer as the HTTP transport encodes it.
const ProcedureFlag = z.object({ result: z.object({ data: z.boolean() }) });

// What the real HTTP transport answers a call whose procedure returns yes or no.
export const procedureFlag = async (
  url: string,
  call: RawProcedureCall,
): Promise<boolean> => {
  const response = await fetch(procedureRequest(url, call));

  return ProcedureFlag.parse(await response.json()).result.data;
};
