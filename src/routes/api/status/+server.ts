export const GET = () =>
  Response.json(
    {
      ok: true,
      service: 'personal-health-cockpit',
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  );
