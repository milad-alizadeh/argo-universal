import {
  allowMenuWide,
  allowOnceLeads,
  enterSendsPicked,
  groupedPhone,
  rejectMenuWide,
  rejectWithoutFeedback,
} from '../../../../../mocks/requests/permission/agent-options.test.mocks';
import { meta as permissionTestMeta } from '../../../../../mocks/requests/permission/permission-story-context.test.mocks';
import { permissionMocks } from '../request.mocks';

const meta = { ...permissionTestMeta, title: 'Tests/PermissionRequest' };

export default meta;

export const AllowMenuWide = allowMenuWide();

export const SecondAgentAllowMenuWide = allowMenuWide(permissionMocks[1]);

export const AllowOnceLeads = allowOnceLeads();

export const SecondAgentAllowOnceLeads = allowOnceLeads(permissionMocks[1]);

export const EnterSendsPicked = enterSendsPicked();

export const SecondAgentEnterSendsPicked = enterSendsPicked(permissionMocks[1]);

export const RejectMenuWide = rejectMenuWide();

export const SecondAgentRejectMenuWide = rejectMenuWide(permissionMocks[1]);

export const GroupedPhone = groupedPhone();

export const SecondAgentGroupedPhone = groupedPhone(permissionMocks[1]);

export const RejectWithoutFeedbackPhone = rejectWithoutFeedback(390);

export const RejectWithoutFeedbackWide = rejectWithoutFeedback(1440);

export const SecondAgentRejectWithoutFeedbackPhone = rejectWithoutFeedback(
  390,
  permissionMocks[1],
);

export const SecondAgentRejectWithoutFeedbackWide = rejectWithoutFeedback(
  1440,
  permissionMocks[1],
);
