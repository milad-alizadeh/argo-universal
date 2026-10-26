import { ruleTester } from './rule-tester.ts';
import { screenSpacing } from './screen-spacing.ts';

const spaced = [{ messageId: 'screenSpacing' }];

ruleTester.run('screen-spacing', screenSpacing, {
  valid: [
    '<View className="flex-1" />;',
    '<View className="min-h-0 flex-1 items-center" />;',
    "<View className={cn('w-full', filled && 'flex-1')} />;",
    '<View style={column} />;',
    '<Text role="secondary" className="text-muted-foreground" />;',
    '<View className="size-1.5 rounded-full" />;',
    '<Stack direction="row" align="center" />;',
    '<Spacer size={2} />;',
    '<Card density="compact" />;',
  ],
  invalid: [
    { code: '<View className="px-4" />;', errors: spaced },
    { code: '<View className="flex-1 wide:pt-0" />;', errors: spaced },
    { code: '<View className="-mx-4 wide:mx-0" />;', errors: spaced },
    { code: '<View className="gap-2" />;', errors: spaced },
    {
      code: "<View className={cn('w-full', open && 'pb-2')} />;",
      errors: spaced,
    },
    {
      code: "<View className={loading ? 'flex-1' : 'gap-y-3'} />;",
      errors: spaced,
    },
    { code: '<View className={`flex-1 ${wide} mt-2`} />;', errors: spaced },
    { code: '<Column contentClassName="space-y-4" />;', errors: spaced },
    { code: '<Stack direction="column" gap={2} />;', errors: spaced },
    { code: '<Surface kind="card" padding={4} />;', errors: spaced },
    { code: '<FieldList gap="sm" />;', errors: spaced },
    { code: '<List paddingTop={3} />;', errors: spaced },
    { code: '<Grid columnGap={2} />;', errors: spaced },
  ],
});
