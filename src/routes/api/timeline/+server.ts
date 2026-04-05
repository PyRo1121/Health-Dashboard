import { createDbActionPostHandler } from '$lib/server/http/action-route';
import { loadTimelinePage, type TimelinePageState } from '$lib/features/timeline/controller';

type TimelineRequest = { action: 'load'; state: TimelinePageState };

export const POST = createDbActionPostHandler<TimelineRequest, TimelinePageState>({
  load: (db, body) => loadTimelinePage(db, body.state),
});
