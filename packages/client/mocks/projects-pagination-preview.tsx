import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  ProjectsList,
  type ProjectsListProps,
} from '../src/components/ProjectsList';
import { largeSessions } from './projects-list-mock';

export function ProjectsPaginationPreview(props: ProjectsListProps) {
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function loadNextPage() {
    if (timer.current !== null || visibleCount >= 100) return;
    props.onEndReached();
    setLoading(true);
    timer.current = setTimeout(() => {
      setVisibleCount((count) => count + 20);
      setLoading(false);
      timer.current = null;
    }, 2000);
  }

  return (
    <View className="w-full wide:w-shell-list" style={{ height: 480 }}>
      <ProjectsList
        {...props}
        sessions={largeSessions.slice(0, visibleCount)}
        isFetchingNextPage={loading}
        onEndReached={loadNextPage}
      />
    </View>
  );
}
