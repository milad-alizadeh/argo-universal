import { iconButtonPart } from '../icon-button-part';
import { selectionPartSchemas } from '../selection-parts';
import { wireParts } from '../wire-parts';

export const actionsPartSchemas = {
  Button: wireParts.Button,
  IconButton: iconButtonPart,
  SplitButton: selectionPartSchemas.SplitButton,
  'Action.Section': wireParts['Action.Section'],
  Action: wireParts.Action,
};
