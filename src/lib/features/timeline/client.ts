import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	createTimelinePageState,
	loadTimelinePage as loadTimelinePageController,
	setTimelineFilter,
	type TimelinePageState
} from './controller';

export { createTimelinePageState, setTimelineFilter };

export async function loadTimelinePage(state: TimelinePageState): Promise<TimelinePageState> {
	return await postFeatureRequest(
		'/api/timeline',
		{
			action: 'load',
			state
		},
		(db) => loadTimelinePageController(db, state)
	);
}
