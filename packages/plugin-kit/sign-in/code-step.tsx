import {
  Button,
  Spacer,
  Stack,
  Text,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { CodeCountdown } from './code-countdown';
import { CodeTile } from './code-tile';
import type { CodeStep } from './steps';

type Props = { step: CodeStep; name: string; cancel: () => void };

// The App runs the steps in order, so the code is on the clipboard by the time the service's page asks for it.
const copyAndOpen = ({
  userCode,
  verificationUri,
}: CodeStep): PluginProps['Button']['onPress'] => ({
  action: 'sequence',
  steps: [
    { action: 'copy', text: userCode },
    { action: 'openUrl', url: verificationUri },
  ],
});

const CopyAndOpen = ({ step, name }: Omit<Props, 'cancel'>): JSX.Element => (
  <Button
    label={`Copy code and open ${name}`}
    fullWidth="narrow"
    onPress={copyAndOpen(step)}
  />
);

// Trailing in a row; on a narrow window they stack full width with the primary on top, as pairing's footer does.
const Footer = ({ step, name, cancel }: Props): JSX.Element => (
  <Stack direction={{ compact: 'column-reverse', wide: 'row' }} gap={2}>
    <Spacer />
    <Button
      label="Cancel"
      variant="secondary"
      fullWidth="narrow"
      onPress={cancel}
    />
    <CopyAndOpen step={step} name={name} />
  </Stack>
);

// The device flow's one job for the person: this code, where it goes, and how long it lasts.
export const CodeShown = (props: Props): JSX.Element => (
  <>
    <Text role="secondary">
      {`Enter this code on ${props.name}, then approve Argo.`}
    </Text>
    <CodeTile code={props.step.userCode} />
    <CodeCountdown {...props.step} />
    <Footer {...props} />
  </>
);
