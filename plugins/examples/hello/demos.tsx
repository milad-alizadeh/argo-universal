import { Card, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { demos } from './demo-list';

// The Hello nav item is the Plugin's only rail entry; each demo is a page below it.
const navPath = '/plugins/hello/hello';

const headingRole = 'heading';

type Demo = (typeof demos)[number];

// A Plugin opens a page by its full App path: the Plugin id, the nav id, then the page's own path.
export const demoHref = (demo: Demo): string => `${navPath}/${demo.path}`;

const renderDemo = (demo: Demo): JSX.Element => (
  <Card
    key={demo.path}
    title={demo.title}
    subtitle={demo.subtitle}
    onPress={{ action: 'navigate', path: demoHref(demo) }}
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
