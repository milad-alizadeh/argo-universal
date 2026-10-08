import { View } from 'react-native';

export function SessionsLoading() {
  return (
    <View
      role="status"
      accessibilityLabel="Loading Sessions"
      // Matches the list's content padding so the rows don't shift when Sessions load.
      className="px-gutter-list pt-5 wide:gap-0.5 wide:px-2"
    >
      <View className="h-10 wide:h-8 flex-row items-center gap-2 px-2.5">
        <View className="size-4 rounded-sm bg-foreground/5" />
        <View className="h-2.5 w-26 rounded-sm bg-foreground/5" />
      </View>
      {[
        ['w-44', 'w-30', 'w-22'],
        ['w-36', 'w-24', 'w-16'],
        ['w-49', 'w-33', 'w-26'],
        ['w-32', 'w-22', 'w-18'],
      ].map(([title, activity, metadata], index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a fixed skeleton list that never reorders or changes
        <View key={index} className="flex-row gap-2 px-2.5 py-3 wide:py-2">
          <View className="h-6 wide:h-5 w-4 items-center justify-center shrink-0">
            <View
              testID="session-skeleton-icon"
              className="size-4 rounded-full bg-foreground/5"
            />
          </View>
          <View className="flex-1 gap-0.5">
            <View className="h-6 wide:h-5 justify-center">
              <View
                testID="session-skeleton-title"
                className={`h-2.5 rounded-sm bg-foreground/5 ${title}`}
              />
            </View>
            <View className="h-5 wide:h-4 justify-center">
              <View className={`h-2 rounded-sm bg-foreground/5 ${activity}`} />
            </View>
            <View className="h-5 justify-center pt-1">
              <View className={`h-2 rounded-sm bg-foreground/5 ${metadata}`} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
