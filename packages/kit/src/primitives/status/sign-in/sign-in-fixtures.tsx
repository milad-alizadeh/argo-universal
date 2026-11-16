import { FieldGroup } from '#primitives/fields/field-group';
import type { SignInProps } from './sign-in-props';

const noop = (): void => undefined;

export const signedOutSignIn = {
  service: 'Service',
  title: 'Connect your account',
  description: 'Sign in to use Service in Argo.',
  footer: 'Opens your browser.',
  children: [
    <FieldGroup.Link
      key="start"
      title="Sign in to Service"
      action
      onPress={noop}
    />,
  ],
} satisfies SignInProps;

export const codeSignIn = {
  service: 'Service',
  title: 'Enter this code on Service',
  description: 'Service asks for it after you continue.',
  footer: 'Waiting for Service… The code lasts 15 minutes.',
  children: [
    <FieldGroup.Value key="code" title="Code" value="WDJB-MJHT" />,
    <FieldGroup.Link
      key="continue"
      title="Copy code and continue to Service"
      action
      onPress={noop}
    />,
    <FieldGroup.Link key="cancel" title="Cancel" action onPress={noop} />,
  ],
} satisfies SignInProps;

export const signedInSignIn = {
  service: 'Service',
  title: 'Connected',
  footer: 'Manage this Account in Settings.',
  signedIn: true,
  children: [
    <FieldGroup.Value
      key="account"
      title="Account"
      value="someone@example.com"
    />,
  ],
} satisfies SignInProps;

export const headerOnlySignIn = {
  service: 'Service',
  title: 'Continue on the Server Device',
  description: 'Open Service in Argo on the Server Device to sign in.',
  footer: 'This device updates when you’re done.',
} satisfies SignInProps;

export const requestingSignIn = {
  service: 'Service',
  title: 'Asking Service for a code…',
} satisfies SignInProps;
