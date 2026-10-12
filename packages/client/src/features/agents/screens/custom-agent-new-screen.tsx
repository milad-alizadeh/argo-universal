import type * as React from 'react';
import { View } from 'react-native';
import { useNavigate } from '#lib/product/navigation/context';
import { SettingsPage } from '#lib/product/settings-page';
import {
  CustomAgentForm,
  type CustomAgentFormProps,
  customAgentFormDescription,
} from '../components/custom-agent-form';
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
export function CustomAgentNewScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-background wide:bg-transparent">
      <SettingsPage
        title="Add custom Agent"
        caption={customAgentFormDescription}
      >
        <AddAgentForm />
      </SettingsPage>
    </View>
  );
}

function AddAgentForm(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <CustomAgentForm
      submitLabel="Add Agent"
      onSubmit={useRegisterAgent()}
      onCancel={() => navigate({ to: 'settings-agents' })}
    />
  );
}
