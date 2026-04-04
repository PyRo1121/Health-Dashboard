export function startOfWeek(localDay: string): string {
	const date = new Date(`${localDay}T00:00:00.000Z`);
	const day = date.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	date.setUTCDate(date.getUTCDate() + diff);
	return date.toISOString().slice(0, 10);
}
