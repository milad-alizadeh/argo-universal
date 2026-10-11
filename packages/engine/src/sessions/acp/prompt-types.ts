import type { PromptRequest, PromptResponse } from '@agentclientprotocol/sdk';

// The machine names the prompt's shape here, so only the translator imports the SDK.
export type AcpPromptRequest = PromptRequest;
export type AcpPromptResponse = PromptResponse;
