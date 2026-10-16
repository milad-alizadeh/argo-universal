import { z } from 'zod';
import { startSupervisor } from '../src/supervisor';

// The real Supervisor runs the real Engine with only the shared Agent and Registry fixtures replaced.
startSupervisor({
  watch: false,
  engineEntry: z.string().parse(process.env.ARGO_E2E_ENGINE_ENTRY),
});
