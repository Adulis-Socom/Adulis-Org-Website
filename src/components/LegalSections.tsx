import { getTranslations } from 'next-intl/server';
import { UndecidedFlag } from './ui';

type Section = { title: string; body?: string };

/**
 * The four legal pages share one shape: a fixed section map, and body text that
 * is mostly still undecided.
 *
 * The section map is deliberately real while the bodies are not. A reader — and
 * an app-store reviewer — can see that Privacy has a retention section and a
 * deletion section, which is most of what they are checking for, without the site
 * pretending to have approved legal text it does not have.
 *
 * ⚠ Undecided bodies render through `UndecidedFlag`, which is visually
 * unmistakable. Never substitute plausible-looking prose: an unapproved sentence
 * in a privacy notice is a legal exposure, and one that reads well is worse than
 * one that reads like a placeholder, because nobody removes it.
 *
 * These pages stay `noindex` while any body is undecided — see the `unbuilt`
 * flag passed by each route's `generateMetadata`.
 */

/**
 * `1. Scope` -> `scope`.
 *
 * The leading number is stripped so an anchor survives a section being renumbered,
 * which is the one edit these documents reliably get.
 */
export function sectionId(title: string): string {
  return title
    .replace(/^\d+\.\s*/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function LegalSections({ namespace }: { namespace: string }) {
  const t = await getTranslations(namespace);
  const common = await getTranslations('common');
  const sections = t.raw('sections') as Section[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      <nav aria-labelledby="on-this-page" className="section-tight">
        <h2 id="on-this-page" className="section-title">
          {common('onThisPage')}
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.title}>
              <a
                href={`#${sectionId(section.title)}`}
                className="inline-flex min-h-[44px] items-center text-body text-ink hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="section-tight pb-12">
        {sections.map((section) => (
          <section
            key={section.title}
            id={sectionId(section.title)}
            className="scroll-mt-8 border-t border-line py-6"
          >
            <h2 className="section-title">{section.title}</h2>
            {section.body ? (
              <p className="card-body max-w-prose">{section.body}</p>
            ) : (
              <UndecidedFlag>{common('undecidedLegal')}</UndecidedFlag>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
