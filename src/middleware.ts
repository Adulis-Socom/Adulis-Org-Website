import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Run on everything except Next internals, the API surface and static files.
  // The dot exclusion also keeps /.well-known/* out of locale rewriting, which
  // matters when the App Links and Universal Links association files land there.
  matcher: ['/((?!api|_next|_vercel|.*\..*).*)']
};
