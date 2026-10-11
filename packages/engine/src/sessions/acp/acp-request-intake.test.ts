import type {
  CreateElicitationRequest,
  RequestPermissionRequest,
} from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';
import {
  toPendingElicitation,
  toPendingPermission,
} from './acp-request-intake';

const allow = { optionId: 'allow', name: 'Allow', kind: 'allow_once' } as const;
const deny = { optionId: 'deny', name: 'Deny', kind: 'reject_once' } as const;
const form = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
  required: ['name'],
} as const;

describe('an ACP permission request', (): void => {
  it.each([
    [
      'presents the Agent options and the tool call title',
      {
        sessionId: 'acp-1',
        toolCall: { toolCallId: 'tool-1', title: 'Run tests' },
        options: [allow, deny],
      },
      { toolCallId: 'tool-1', title: 'Run tests', options: [allow, deny] },
    ],
    [
      'titles an untitled tool call by its id',
      {
        sessionId: 'acp-1',
        toolCall: { toolCallId: 'tool-2' },
        options: [allow],
      },
      { toolCallId: 'tool-2', title: 'tool-2', options: [allow] },
    ],
  ] satisfies [string, RequestPermissionRequest, object][])(
    '%s',
    (_, params, request): void => {
      expect(toPendingPermission('request-1', params)).toEqual({
        type: 'presented',
        request: { requestId: 'request-1', ...request },
      });
    },
  );

  it.each([
    ['offers no option', []],
    ['repeats an option id', [allow, allow]],
  ] satisfies [string, RequestPermissionRequest['options']][])(
    'is rejected when it %s',
    (_, options): void => {
      const intake = toPendingPermission('request-1', {
        sessionId: 'acp-1',
        toolCall: { toolCallId: 'tool-1' },
        options,
      });
      expect(intake).toEqual({ type: 'rejected', reason: expect.any(String) });
    },
  );
});

describe('an ACP elicitation request', (): void => {
  it.each([
    [
      'form scoped to a Session',
      {
        mode: 'form',
        sessionId: 'acp-1',
        message: 'Who?',
        requestedSchema: form,
      },
      {
        requestId: 'request-1',
        mode: 'form',
        message: 'Who?',
        requestedSchema: form,
      },
    ],
    [
      'form scoped to a tool call',
      {
        mode: 'form',
        sessionId: 'acp-1',
        toolCallId: 'tool-1',
        message: 'Who?',
        requestedSchema: form,
      },
      {
        requestId: 'request-1',
        mode: 'form',
        message: 'Who?',
        requestedSchema: form,
        toolCallId: 'tool-1',
      },
    ],
  ] satisfies [string, CreateElicitationRequest, object][])(
    'presents a %s',
    (_, params, request): void => {
      expect(toPendingElicitation('request-1', params)).toEqual({
        type: 'presented',
        request,
      });
    },
  );

  it('leaves a URL elicitation unsupported', (): void => {
    expect(
      toPendingElicitation('request-1', {
        mode: 'url',
        sessionId: 'acp-1',
        message: 'Sign in',
        elicitationId: 'elicitation-1',
        url: 'https://example.com',
      }),
    ).toEqual({ type: 'unsupported' });
  });

  it('rejects an unknown mode by name', (): void => {
    expect(
      toPendingElicitation('request-1', {
        mode: 'voice',
        sessionId: 'acp-1',
        message: 'Speak',
      }),
    ).toEqual({ type: 'rejected', reason: 'Unknown Elicitation mode voice' });
  });

  it('rejects a form the contract does not recognise', (): void => {
    const params: CreateElicitationRequest = {
      mode: 'form',
      sessionId: 'acp-1',
      message: 'Who?',
      requestedSchema: {
        type: 'object',
        properties: { name: { type: 'date' } },
      },
    };
    expect(toPendingElicitation('request-1', params)).toEqual({
      type: 'rejected',
      reason: expect.any(String),
    });
  });
});
