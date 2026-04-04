export function serializeForStorage<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
}

export function deserializeFromStorage<T>(value: T): T {
	return serializeForStorage(value);
}
