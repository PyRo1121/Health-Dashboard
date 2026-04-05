import { describe, expect, it, vi } from 'vitest';
import { searchWgerExercises } from '$lib/server/movement/wger';

describe('wger adapter', () => {
  it('normalizes official-style exercise search results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 123,
            name: 'Goblet squat',
            muscles: [{ name: 'Quadriceps' }],
            equipment: [{ name: 'Dumbbell' }],
            description: 'Stand tall and squat deep.',
            images: [{ image: 'https://wger.de/media/exercise.png' }],
          },
        ],
      }),
    });

    const results = await searchWgerExercises('squat', fetchImpl as never);

    expect(fetchImpl).toHaveBeenCalled();
    expect(results).toEqual([
      {
        id: 'wger:123',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        sourceType: 'wger',
        externalId: '123',
        title: 'Goblet squat',
        muscleGroups: ['Quadriceps'],
        equipment: ['Dumbbell'],
        instructions: 'Stand tall and squat deep.',
        imageUrl: 'https://wger.de/media/exercise.png',
      },
    ]);
  });

  it('fails fast when the wger payload shape drifts', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ broken: true }],
      }),
    });

    await expect(searchWgerExercises('squat', fetchImpl as never)).rejects.toThrow(
      /invalid wger response payload/i
    );
  });
});
