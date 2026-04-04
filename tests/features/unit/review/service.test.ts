import { describe, expect, it } from 'vitest';
import { saveAssessmentProgress, submitAssessment } from '$lib/features/assessments/service';
import { commitImportBatch, previewImport } from '$lib/features/imports/service';
import { buildWeeklySnapshot, computeCorrelations, computeTrendComparisons, saveNextWeekExperiment } from '$lib/features/review/service';
import { setSobrietyStatusForDay } from '$lib/features/sobriety/service';
import { createFoodEntry } from '$lib/features/nutrition/service';
import { saveDailyCheckin } from '$lib/features/today/service';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('review service', () => {
	const getDb = useTestHealthDb('review-service');

	async function seedWeek() {
		const db = getDb();
		await saveDailyCheckin(db, {
			date: '2026-03-30',
			mood: 3,
			energy: 2,
			stress: 3,
			focus: 3,
			sleepHours: 6,
			sleepQuality: 3
		});
		await createFoodEntry(db, {
			localDay: '2026-03-30',
			mealType: 'breakfast',
			name: 'Low protein breakfast',
			calories: 250,
			protein: 25,
			fiber: 6
		});

		await saveDailyCheckin(db, {
			date: '2026-04-01',
			mood: 5,
			energy: 4,
			stress: 2,
			focus: 4,
			sleepHours: 8,
			sleepQuality: 4
		});
		await createFoodEntry(db, {
			localDay: '2026-04-01',
			mealType: 'breakfast',
			name: 'Higher protein breakfast',
			calories: 420,
			protein: 95,
			fiber: 9
		});

		await saveDailyCheckin(db, {
			date: '2026-04-02',
			mood: 4,
			energy: 4,
			stress: 2,
			focus: 4,
			sleepHours: 7.5,
			sleepQuality: 4
		});
		await createFoodEntry(db, {
			localDay: '2026-04-02',
			mealType: 'lunch',
			name: 'Chicken salad',
			calories: 410,
			protein: 88,
			fiber: 7
		});
		await setSobrietyStatusForDay(db, { localDay: '2026-04-01', status: 'sober' });
		await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
		await submitAssessment(db, {
			localDay: '2026-04-02',
			instrument: 'WHO-5',
			itemResponses: [3, 3, 3, 4, 4]
		});
		const batch = await previewImport(db, {
			sourceType: 'healthkit-companion',
			rawText: HEALTHKIT_BUNDLE_JSON
		});
		await commitImportBatch(db, batch.id);
	}

	it('computes weekly trend comparisons', async () => {
		const db = getDb();
		await seedWeek();
		const trends = await computeTrendComparisons(db, '2026-04-02');
		expect(trends.weekStart).toBe('2026-03-30');
		expect(trends.daysTracked).toBe(3);
		expect(trends.averageMood).toBeGreaterThan(3);
		expect(trends.averageProtein).toBeGreaterThan(60);
	});

	it('derives explainable correlations from sleep and protein', async () => {
		const db = getDb();
		await seedWeek();
		const records = await db.dailyRecords.toArray();
		const foods = await db.foodEntries.toArray();
		const correlations = computeCorrelations(records, foods);
		expect(correlations.some((item) => item.label.includes('Higher sleep'))).toBe(true);
		expect(correlations.some((item) => item.label.includes('Higher protein'))).toBe(true);
	});

	it('builds a weekly snapshot with flags and experiment options', async () => {
		const db = getDb();
		await seedWeek();
		const weekly = await buildWeeklySnapshot(db, '2026-04-02');
		expect(weekly.snapshot.headline).toBeTruthy();
		expect(weekly.snapshot.daysTracked).toBe(3);
		expect(weekly.experimentOptions).toHaveLength(3);
		expect(weekly.assessmentSummary[0]).toContain('WHO-5');
		expect(weekly.deviceHighlights.some((line) => line.includes('Sleep'))).toBe(true);
	});

	it('saves the next-week experiment into the snapshot', async () => {
		const db = getDb();
		await seedWeek();
		const snapshot = await saveNextWeekExperiment(db, '2026-04-02', 'Try 10 min morning mindfulness');
		expect(snapshot.experiment).toBe('Try 10 min morning mindfulness');
		expect((await db.reviewSnapshots.count())).toBe(1);
	});

	it('keeps partial assessments out of the assessment summary', async () => {
		const db = getDb();
		await seedWeek();
		await saveAssessmentProgress(db, {
			localDay: '2026-04-02',
			instrument: 'GAD-7',
			itemResponses: [1, 1]
		});
		const weekly = await buildWeeklySnapshot(db, '2026-04-02');
		expect(weekly.assessmentSummary.some((line) => line.includes('GAD-7'))).toBe(false);
	});
});
