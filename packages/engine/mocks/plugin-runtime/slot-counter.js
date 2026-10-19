import { Button, Stack, Text, useState } from '@argo/plugin-kit';

const greeting = (projectId, waves) =>
  waves === 0
    ? `Hello from ${projectId}`
    : `Waved at ${projectId} ${waves} times`;

// Project details' Slot: `context` is frozen and holds only the Project id.
function ProjectDetails({ context }) {
  const [waves, setWaves] = useState(0);

  return (
    <Stack direction="column" gap={2}>
      <Text>{greeting(context.projectId, waves)}</Text>
      <Button
        label="Wave"
        variant="outline"
        onPress={() => setWaves(waves + 1)}
      />
    </Stack>
  );
}

export function register(argo) {
  argo.slots.register('argo/project/details/v1', ProjectDetails);
}
