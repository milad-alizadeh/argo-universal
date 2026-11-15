import type { SignInState } from '@repo/contracts/plugins/device-flow-api';
import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';

type Pressed = Parameters<typeof jsx>[1][string];

// What the token field needs of the sign-in page: the service's name and the run a paste sends.
type Pasting = { name: string; paste: Pressed };

// Why the last token pasted was not kept, when it was not.
export const failureOf = (state: SignInState): string | undefined =>
  state.kind === 'failed' ? state.message : undefined;

const errorOf = (error: string | undefined): { error?: string } =>
  error ? { error } : {};

const footerOf = (error: string | undefined): { footer?: string } =>
  error ? { footer: error } : {};

// The pasted text goes only to `signIn`'s secret `token` param (ADR-0051), and the field never shows it back.
const secretField = (parts: Pasting, error: string | undefined): ReactElement =>
  jsx(
    'FieldGroup.SecretField',
    {
      title: 'API token',
      value: '',
      placeholder: `Paste a ${parts.name} API token`,
      onChangeText: parts.paste,
      ...errorOf(error),
    },
    'token',
  );

// The field a token is pasted into, with why the last one was not kept beneath it.
export const tokenField = (
  parts: Pasting,
  error: string | undefined,
): ReactElement =>
  jsx(
    'FieldGroup',
    {
      children: jsx('FieldGroup.Section', {
        ...footerOf(error),
        children: secretField(parts, error),
      }),
    },
    'paste',
  );
