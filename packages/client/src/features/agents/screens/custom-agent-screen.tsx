import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/context';
import {
  CustomAgentForm,
  type CustomAgentFormProps,
} from '../components/custom-agent-form';
import { SettingsScroll } from '../components/settings-scroll';
import { useCustomAgentMutations } from '../hooks/use-custom-agents';

function useRegisterAgent(): CustomAgentFormProps['onSubmit'] {
  const navigate = useNavigate();
  const { register } = useCustomAgentMutations();
  return async (definition) => {
    const result = await register(definition);
    if (result.status === 'ready')
      navigate(
        { to: 'settings-agent', agent: result.agentId },
        { replace: true },
      );
    return result;
  };
}

// Adds an Agent from outside the ACP Registry; the Server saves it only once it answers ACP initialize.
export function CustomAgentScreen(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <SettingsScroll>
      <CustomAgentForm
        submitLabel="Add Agent"
        onSubmit={useRegisterAgent()}
        onCancel={() => navigate({ to: 'settings-agents' })}
      />
    </SettingsScroll>
  );
}
