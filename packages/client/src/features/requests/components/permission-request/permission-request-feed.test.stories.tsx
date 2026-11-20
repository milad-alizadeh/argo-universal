import { layoutWidths } from '@repo/kit/mocks/story-layout';
import {
  chosenOptionFeed,
  permissionFeed,
} from '../../../../../mocks/requests/permission/permission-feed.test.mocks';
import { meta as permissionTestMeta } from '../../../../../mocks/requests/permission/permission-story-context.test.mocks';

const meta = {
  ...permissionTestMeta,
  title: 'Tests/Requests/PermissionRequest/Feed',
};

export default meta;

export const FirstAgentApproval = permissionFeed(layoutWidths.wide, 0, false);

export const SecondAgentApproval = permissionFeed(layoutWidths.wide, 1, false);

export const FirstAgentOutcome = permissionFeed(layoutWidths.wide, 0, true);

export const SecondAgentOutcome = permissionFeed(layoutWidths.wide, 1, true);

export const AgentNamedOption = chosenOptionFeed(layoutWidths.wide, 0, {
  name: 'Always Allow',
  kind: 'allow_always',
});
