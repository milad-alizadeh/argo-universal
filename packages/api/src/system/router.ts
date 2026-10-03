import { router } from '../trpc';
import { clock } from './clock';
import { info } from './info';

export const systemRouter = router({ info, clock });
