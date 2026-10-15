import type * as React from 'react';
import { Placeholder } from '#lib/product/placeholder';

export function AgentPlaceholder({
  agent,
}: {
  agent: string;
}): React.JSX.Element {
  return (
    <Placeholder
      title="Agent"
      description={`Settings for ${agent} will appear here.`}
    />
  );
}
