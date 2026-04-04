export function clampScore(value: number, min = 0, max = 5): number {
	return Math.min(max, Math.max(min, value));
}

export function isValidLocalDay(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateConfidence(value: number): boolean {
	return Number.isFinite(value) && value >= 0 && value <= 1;
}
