import { firstSchedule } from '../scheduled-fixtures';

export const longInstructions = {
  schedule: {
    ...firstSchedule,
    instructions: `${'Review the build and summarize the results. '.repeat(300)}End of instructions.`,
  },
};
