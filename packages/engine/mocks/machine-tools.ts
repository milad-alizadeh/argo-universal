import { createMachinePath, type MachinePath } from './machine-path';

export type Omitted = 'node' | 'npm' | 'uv';

// Puts every tool on PATH except the omitted one; Node.js itself comes from the test PATH unless omitted.
export const machineWithout = async (
  omitted?: Omitted,
): Promise<MachinePath> => {
  const machine = await createMachinePath({ node: omitted !== 'node' });

  for (const tool of ['npm', 'uv'] as const)
    if (tool !== omitted) await machine.place(tool);

  return machine;
};
