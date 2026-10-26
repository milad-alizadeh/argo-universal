import { Card, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

// The Hello nav item is the Plugin's only rail entry; each demo is a page below it.
const navPath = '/plugins/hello/hello';

const headingRole = 'heading';

export const demos = [
  { path: 'lists', title: 'Lists', subtitle: 'Cards, selection and badges' },
  { path: 'dashboard', title: 'Dashboard', subtitle: 'A grid of cards' },
  { path: 'form', title: 'Form', subtitle: 'Fields that create an Issue' },
  { path: 'builds', title: 'Builds', subtitle: 'A list beside its detail' },
  { path: 'gallery', title: 'Gallery', subtitle: 'Thumbnails and a grid' },
  { path: 'media', title: 'Media', subtitle: 'Audio and video' },
  { path: 'runs', title: 'Runs', subtitle: 'A table of runs' },
  { path: 'canvas', title: 'Canvas', subtitle: 'Drawing on a Canvas' },
  { path: 'views', title: 'Issue views', subtitle: 'A segmented switcher' },
  { path: 'posts', title: 'Remote posts', subtitle: 'A paged list from fetch' },
  { path: 'log', title: 'Log', subtitle: 'A list anchored to its end' },
];

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
