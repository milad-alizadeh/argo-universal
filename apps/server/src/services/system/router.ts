import { router } from '../../engine/trpc';
import { clock } from './clock-procedure';
import { info } from './info-procedure';

export const systemRouter = router({ info, clock });
