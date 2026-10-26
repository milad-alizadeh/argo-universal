import { Card, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { demos } from './demo-list';

const headingRole = 'heading';

type Demo = (typeof demos)[number];

// A demo opens by the path it registers, as `/builds`.
const demoPath = (demo: Demo): string => `/${demo.path}`;

const renderDemo = (demo: Demo): JSX.Element => (
  <Card
    key={demo.path}
    title={demo.title}
    subtitle={demo.subtitle}
    onPress={{ action: 'navigate', path: demoPath(demo) }}
  />
);

// Pressable Cards, not a List: the page's ScrollView holds the intro and the demos, and a List scrolls on its own.
export function HelloDemos(): JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      <Text role={headingRole}>Demos</Text>
      {demos.map(renderDemo)}
    </Stack>
  );
}
