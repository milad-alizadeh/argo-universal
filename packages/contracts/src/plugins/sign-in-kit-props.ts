import { z } from 'zod';
import { stringLabel } from './kit-component-props';

// A Plugin's sign-in to one service, laid out as Settings is: what the step is beside the service's mark, then rows.
export const signInProps = z.object({
  service: stringLabel.describe(
    'The service’s name, such as GitHub: what the mark is called for assistive technology.',
  ),
  title: z
    .string()
    .describe(
      'What this step is, such as “Connect your account”. The Screen’s title already names the service.',
    ),
  description: z
    .string()
    .optional()
    .describe('One supporting line under the title.'),
  footer: z.string().optional().describe('Supporting text under the rows.'),
  signedIn: z
    .boolean()
    .optional()
    .describe('The mark shows that the Account is signed in.'),
});
