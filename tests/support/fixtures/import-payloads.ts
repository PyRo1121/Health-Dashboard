export const APPLE_HEALTH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" value="4321" startDate="2026-04-02T08:00:00Z" />
</HealthData>`;

export const DAY_ONE_JSON = JSON.stringify({
	entries: [
		{
			uuid: 'entry-1',
			creationDate: '2026-04-02T09:00:00Z',
			text: 'Morning reflection from Day One.'
		}
	]
});
