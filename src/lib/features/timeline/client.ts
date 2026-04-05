import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  createTimelinePageState,
  loadTimelinePage as loadTimelinePageController,
  setTimelineFilter,
  type TimelinePageState,
} from './controller';

export { createTimelinePageState, setTimelineFilter };

const timelineClient = createFeatureActionClient('/api/timeline');

export async function loadTimelinePage(state: TimelinePageState): Promise<TimelinePageState> {
  return await timelineClient.stateAction('load', state, (db) =>
    loadTimelinePageController(db, state)
  );
}
