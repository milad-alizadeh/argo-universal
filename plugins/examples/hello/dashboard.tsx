import {
  Card,
  Grid,
  Screen,
  ScrollView,
  Spacer,
  Stack,
  Text,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

const headingRole = 'heading';

const metrics = [
  { title: 'Open', value: '12' },
  { title: 'In progress', value: '3' },
  { title: 'Done', value: '28' },
  { title: 'Blocked', value: '2' },
  { title: 'In review', value: '5' },
  { title: 'Reopened', value: '1' },
];

export function HelloDashboard(): JSX.Element {
  return (
    <Screen title="Dashboard">
      <ScrollView>
        <Stack direction="column" gap={4}>
          <DashboardHeading />
          <DashboardMetrics />
        </Stack>
      </ScrollView>
    </Screen>
  );
}

function DashboardMetrics(): JSX.Element {
  return (
    <Grid columns={{ compact: 2, medium: 2, wide: 3 }} gap={3}>
      {metrics.map(({ title, value }) => (
        <Card key={title} title={title}>
          <Text role={headingRole}>{value}</Text>
        </Card>
      ))}
    </Grid>
  );
}

function DashboardHeading(): JSX.Element {
  return (
    <Stack direction="row" align="center">
      <Text role={headingRole}>Issues</Text>
      <Spacer />
      <Text role="secondary">This week</Text>
    </Stack>
  );
}
