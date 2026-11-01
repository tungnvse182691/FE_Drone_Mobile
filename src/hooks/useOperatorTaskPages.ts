import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useOperatorReadScope } from './useOperatorReadScope';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto } from '../api/droneApi';

/** Bounded, explicit GET pages. Refresh supersedes in-flight reads, never commands. */
export function useOperatorTaskPages() {
  const scope = useOperatorReadScope();
  const serial = useRef(0), busy = useRef(false);
  const [state, setState] = useState({ scope: scope.key, items: [] as SurveyTaskV2ResponseDto[],
    nextCursor: null as string | null, seen: [] as string[], loading: false, error: null as string | null });
  const visible = state.scope === scope.key && !!scope.key;
  const read = useCallback(async (reset: boolean) => {
    const isCurrent = scope.capture();
    if (!isCurrent() || (!reset && (busy.current || !visible || !state.nextCursor))) return;
    const request = ++serial.current;
    busy.current = true;
    const cursor = reset ? null : state.nextCursor;
    const previous = reset ? [] : state.items, seen = reset ? [] : state.seen;
    setState(s => ({ ...s, ...(visible ? {} : {items: [], nextCursor: null, seen: []}), scope: scope.key, loading: true, error: null }));
    try {
      const page = await listOperatorSurveyTasksReal(cursor, 50);
      if (request !== serial.current || !isCurrent()) return;
      if (!Array.isArray(page.items) || !(page.nextCursor === null || typeof page.nextCursor === 'string' && page.nextCursor.trim()))
        throw Error('invalid_page');
      const consumed = cursor ? [...seen, cursor] : seen;
      const repeated = !!page.nextCursor && consumed.includes(page.nextCursor);
      const items = [...new Map([...previous, ...page.items].map(item => [item.id.toLowerCase(), item])).values()];
      setState({scope: scope.key, items, nextCursor: repeated ? null : page.nextCursor, seen: consumed,
        loading: false, error: repeated ? 'Máy chủ trả con trỏ trang lặp. Vui lòng làm mới danh sách.' : null});
    } catch {
      if (request === serial.current && isCurrent()) setState(s => ({ ...s, loading: false,
        error: 'Chưa tải được trang nhiệm vụ. Danh sách đã tải được giữ lại; vui lòng thử lại.' }));
    } finally { if (request === serial.current) busy.current = false; }
  }, [scope.key, scope.capture, visible, state.nextCursor, state.items, state.seen]);
  // Focus depends only on identity, not each newly loaded page.
  const latest = useRef(read); latest.current = read;
  const refresh = useCallback(() => latest.current(true), []);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { serial.current++; busy.current = false; };
  }, [scope.key, refresh]));
  return { tasks: visible ? state.items : [], nextCursor: visible ? state.nextCursor : null,
    loading: visible && state.loading, error: visible ? state.error : null, ready: visible,
    refresh, loadMore: () => read(false) };
}
