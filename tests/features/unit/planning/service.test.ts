import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
	ensureWeeklyPlan,
	listWeeklyPlanSlots,
	movePlanSlot,
	savePlanSlot,
	saveWorkoutTemplate
} from '$lib/features/planning/service';

describe('planning service', () => {
	const getDb = useTestHealthDb('planning-service');

	it('creates one weekly plan per week and reuses it on reload', async () => {
		const db = getDb();
		const first = await ensureWeeklyPlan(db, '2026-04-07');
		const second = await ensureWeeklyPlan(db, '2026-04-09');

		expect(first.id).toBe(second.id);
		expect(first.weekStart).toBe('2026-04-06');
	});

	it('stores workout templates for later planning', async () => {
		const db = getDb();
		const template = await saveWorkoutTemplate(db, {
			title: 'Full body reset',
			goal: 'Recovery',
			exerciseRefs: [
				{ name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 },
				{ name: 'Push-up', sets: 3, reps: '12', restSeconds: 45 }
			]
		});

		expect(template.exerciseRefs).toEqual([
			{ name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 },
			{ name: 'Push-up', sets: 3, reps: '12', restSeconds: 45 }
		]);
	});

	it('reorders plan slots within a day and preserves stable order values', async () => {
		const db = getDb();
		const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
		const first = await savePlanSlot(db, {
			weeklyPlanId: weeklyPlan.id,
			localDay: '2026-04-07',
			slotType: 'note',
			itemType: 'freeform',
			title: 'First slot'
		});
		const second = await savePlanSlot(db, {
			weeklyPlanId: weeklyPlan.id,
			localDay: '2026-04-07',
			slotType: 'note',
			itemType: 'freeform',
			title: 'Second slot'
		});

		await movePlanSlot(db, second.id, 'up');

		const slots = await listWeeklyPlanSlots(db, weeklyPlan.id);
		expect(slots.map((slot) => slot.title)).toEqual(['Second slot', 'First slot']);
		expect(slots.map((slot) => slot.order)).toEqual([0, 1]);

		// Adding another slot after reordering should append cleanly, not duplicate an order.
		await savePlanSlot(db, {
			weeklyPlanId: weeklyPlan.id,
			localDay: '2026-04-07',
			slotType: 'note',
			itemType: 'freeform',
			title: 'Third slot'
		});
		const nextSlots = await listWeeklyPlanSlots(db, weeklyPlan.id);
		expect(nextSlots.map((slot) => slot.title)).toEqual(['Second slot', 'First slot', 'Third slot']);
		expect(nextSlots.map((slot) => slot.order)).toEqual([0, 1, 2]);
		expect(first.order).toBe(0);
	});
});
