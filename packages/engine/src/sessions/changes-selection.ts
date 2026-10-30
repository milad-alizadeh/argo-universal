import type { SessionComparison } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { ChangesSelection } from '@repo/git';
import { readProjectPath } from '../projects';

type SessionCheckout = { projectId: string; checkout: { path: string } };

// The Session's Checkout, and the Project's main Checkout the default comparison is made against.
export const sessionChangesSelection = (
  database: Database,
  session: SessionCheckout,
  comparison?: SessionComparison,
): ChangesSelection => ({
  checkout: session.checkout.path,
  projectCheckout: readProjectPath(database, session.projectId),
  comparison,
});
