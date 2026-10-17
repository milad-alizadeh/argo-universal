// A fixture step names its Agent by ordinal.
export const agentStep = (text: string): RegExp =>
  new RegExp(`^(?:Given|And) Agent (\\d+) ${text}$`);

// The scenarios a feature's steps hand to Agents, as Agent ordinal and scenario.
export function agentScenarioSteps<Scenario extends string>(
  table: readonly (readonly [RegExp, Scenario])[],
  steps: string[],
): [number, Scenario][] {
  return steps.flatMap((step) =>
    table.flatMap(([pattern, scenario]): [number, Scenario][] => {
      const match = pattern.exec(step);

      return match ? [[Number(match[1]), scenario]] : [];
    }),
  );
}
