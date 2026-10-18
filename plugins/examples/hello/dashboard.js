import {
  Grid,
  ScrollView,
  Spacer,
  Stack,
  Surface,
  Text,
} from '@argo/plugin-kit';

const headingRole = 'heading';

const metrics = [
  { title: 'Open', value: '12' },
  { title: 'In progress', value: '3' },
  { title: 'Done', value: '28' },
  { title: 'Blocked', value: '2' },
];

export function HelloDashboard() {
  return (
    <ScrollView>
      <Surface kind="background" padding={4}>
        <Stack direction="column" gap={4}>
          <DashboardHeading />
          <DashboardMetrics />
        </Stack>
      </Surface>
    </ScrollView>
  );
}

function DashboardMetrics() {
  return (
    <Grid columns={{ compact: 2, medium: 2, wide: 4 }} gap={3}>
      {metrics.map(({ title, value }) => (
        <Surface key={title} kind="card" padding={4}>
          <Stack direction="column" gap={2}>
            <Text role="secondary">{title}</Text>
            <Text role={headingRole}>{value}</Text>
          </Stack>
        </Surface>
      ))}
    </Grid>
  );
}

function DashboardHeading() {
  return (
    <Stack direction="row" align="center">
      <Text role={headingRole}>Issues</Text>
      <Spacer />
      <Text role="secondary">This week</Text>
    </Stack>
  );
}
