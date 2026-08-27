import { test, expect } from './fixtures';
import { INDEX_POLICY, ROUTES, indexableRoutes } from '@/lib/routes';

/**
 * robots.txt and sitemap.xml, and the one rule that binds them.
 *
 * **A sitemap must never list a route the site serves with `noindex`.** That is
 * a contradiction search engines act on, and it costs crawl budget on a site
 * that has very little to spend.
 *
 * The QA build sets `NEXT_PUBLIC_SITE_URL`, so both files are generated here.
 * With it absent — today's real state — robots disallows everything and the
 * sitemap is empty, which is also correct and is asserted in the unit test below.
 */
test.describe('§6.5 crawler discovery', () => {
  test('robots.txt is served and excludes the API', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('User-Agent: *');
    // Nothing to index behind /api, and one endpoint that answers 204.
    expect(body).toContain('Disallow: /api/');
    expect(body, 'a configured site URL must advertise the sitemap').toContain('Sitemap:');
  });

  test('sitemap lists exactly the routes with no index policy against them', async ({
    request
  }) => {
    const body = await request.get('/sitemap.xml').then((r) => r.text());
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    expect(locs.length, 'sitemap is empty').toBeGreaterThan(0);
    // AM_ENABLED is false, so Amharic must not appear even though /am resolves.
    expect(locs.filter((u) => u.includes('/am')), '/am serves English fallback').toEqual([]);
    expect(locs.length).toBe(indexableRoutes().length);
  });

  /**
   * The contradiction check, against the pages themselves rather than against
   * the policy the sitemap was built from — otherwise this only proves the
   * sitemap agrees with itself.
   */
  test('every listed URL is served without noindex', async ({ request }) => {
    const body = await request.get('/sitemap.xml').then((r) => r.text());
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    const contradictions: string[] = [];
    for (const url of locs) {
      const path = new URL(url).pathname;
      const html = await request.get(path).then((r) => r.text());
      if (/name="robots"[^>]*content="[^"]*noindex/.test(html)) contradictions.push(path);
    }
    expect(
      contradictions,
      `listed in the sitemap but served noindex:\n${contradictions.join('\n')}`
    ).toEqual([]);
  });

  test('every route with an index policy is served WITH noindex', async ({ request }) => {
    const missing: string[] = [];
    for (const key of Object.keys(INDEX_POLICY) as (keyof typeof ROUTES)[]) {
      const path = `/en${ROUTES[key] === '/' ? '' : ROUTES[key]}`;
      const html = await request.get(path).then((r) => r.text());
      if (!/name="robots"[^>]*content="[^"]*noindex/.test(html)) missing.push(path);
    }
    expect(missing, `has an index policy but is not noindex:\n${missing.join('\n')}`).toEqual([]);
  });
});
