import { KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useResolveClassNames } from 'uniwind';
import { useWide } from '../navigation/use-wide';
import {
  type PlanProposalExpansionProps,
  PlanProposalOverlay,
} from './plan-proposal-overlay';

export function PlanProposalExpansion({
  onCollapse,
  children,
}: PlanProposalExpansionProps) {
  const surface = useResolveClassNames('flex-1 bg-popover');
  const wide = useWide();
  if (wide)
    return (
      <PlanProposalOverlay onCollapse={onCollapse}>
        {children}
      </PlanProposalOverlay>
    );
  return (
    <Modal
      visible
      presentationStyle="pageSheet"
      animationType="slide"
      allowSwipeDismissal
      onRequestClose={onCollapse}
    >
      <SafeAreaProvider>
        <SafeAreaView
          edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
          style={surface}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            role="dialog"
            accessibilityLabel="Expanded plan"
            accessibilityViewIsModal
            onAccessibilityEscape={onCollapse}
            className="flex-1 min-h-0"
          >
            {children}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
