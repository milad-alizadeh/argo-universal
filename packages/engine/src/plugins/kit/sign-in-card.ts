import type { SignInOptions } from '@repo/contracts/plugins/sign-in-api';
import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';

export type Pressed = Parameters<typeof jsx>[1][string];

// What one step of the sign-in says and does: its header and its rows.
export type Card = {
  title: string;
  description?: string;
  rows?: ReactElement[];
  footer?: string;
  signedIn?: boolean;
};

// A row that does something, as Settings draws Sign out: no chevron, a button to assistive technology.
export const actionRow = (title: string, onPress: Pressed): ReactElement =>
  jsx('FieldGroup.Link', { title, action: true, onPress });

export const valueRow = (title: string, value: string): ReactElement =>
  jsx('FieldGroup.Value', { title, value });

// The service's logo, when the Plugin ships one; the App draws the Plugin's own icon in its place otherwise.
const markOf = ({ name, logo }: SignInOptions): Record<string, Pressed> =>
  logo ? { mark: jsx('Svg', { xml: logo, label: name }) } : {};

// The kit's one SignIn, for every Plugin: the step beside the service's mark, then its rows.
export function signIn(options: SignInOptions, step: Card): ReactElement {
  const { rows = [], ...text } = step;

  return jsx('SignIn', {
    service: options.name,
    ...text,
    ...markOf(options),
    ...(rows.length > 0 && { children: rows }),
  });
}
