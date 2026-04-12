import {
  listTimelineEvents,
  type TimelineEventItem,
  type TimelineEventsStore,
  type TimelineSourceFilter,
} from '$lib/features/timeline/service';

export type TimelinePageStorage = TimelineEventsStore;

export interface TimelinePageState {
  loading: boolean;
  filter: TimelineSourceFilter;
  items: TimelineEventItem[];
}

export function createTimelinePageState(): TimelinePageState {
  return {
    loading: true,
    filter: 'all',
    items: [],
  };
}

export function setTimelineFilter(
  state: TimelinePageState,
  filter: TimelineSourceFilter
): TimelinePageState {
  return {
    ...state,
    filter,
  };
}

export async function loadTimelinePage(
  store: TimelinePageStorage,
  state: TimelinePageState
): Promise<TimelinePageState> {
  const items = await listTimelineEvents(store, state.filter);
  return {
    ...state,
    loading: false,
    items,
  };
}
