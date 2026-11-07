import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';
import { WAITLIST_HREF } from '@/lib/nav';
import { PhotoSlot } from '@/components/PhotoSlot';
import { DoorLink } from '@/components/DoorLink';
import { SectionLabel } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };
type ExampleScene = { title: string; tags: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return buildPageMetadata({
    locale,
    path: ROUTES.home,
    title: t('pageTitle'),
    description: t('description')
  });
}

/**
 * The international homepage, after the approved prototype (`f448d06`).
 *
 * Section order follows the prototype: hero, the problem, the Adulis model,
 * For You discovery, public storefronts, trust, the journey, availability, and
 * the Seller call to action. Copy is the prototype's, corrected where founder
 * rulings or the system designs require it (see docs/migration).
 *
 * Every illustration that shows a Scene, a Product or a storefront is invented
 * and carries the EXAMPLE marker. No demo Seller name, person or price from the
 * prototype appears: a neutral example cannot be mistaken for a real business.
 *
 * Server-rendered throughout. The only client code is DoorLink, which records
 * the buyer/seller door clicks already in the analytics registry and is a plain
 * link without JavaScript.
 */
export default async function HomePage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const nav = await getTranslations('nav');

  const problems = t.raw('problem.items') as Item[];
  const model = t.raw('model.items') as Item[];
  const trust = t.raw('trust.items') as Item[];
  const steps = t.raw('journey.steps') as string[];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-accent-warm to-surface">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
          <div>
            <SectionLabel>{t('hero.label')}</SectionLabel>
            <h1 className="display mt-5">{t('hero.heading')}</h1>
            <p className="lede">{t('hero.sub')}</p>
            <div className="cta-group">
              <Link href={WAITLIST_HREF} className="btn-primary">
                {nav('waitlistCta')}
              </Link>
              <Link href={ROUTES.howItWorks} className="btn-secondary">
                {t('hero.secondaryCta')}
              </Link>
            </div>
          </div>
          <HeroScene />
        </div>
      </section>

      {/* The problem */}
      <section className="section">
        <div className="container-page">
          <SectionHeader label={t('problem.label')} title={t('problem.title')} />
          <ul className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            {problems.map((item) => (
              <li key={item.title} className="card">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-body">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The Adulis model */}
      <section className="section bg-brand-muted">
        <div className="container-page">
          <SectionHeader label={t('model.label')} title={t('model.title')} />
          <p className="mx-auto mt-5 max-w-prose text-center text-body-l text-content-secondary">
            {t('model.intro')}
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {model.map((item) => (
              <li key={item.title} className="card-bordered">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-body">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* For You discovery */}
      <section className="section">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionLabel>{t('discovery.label')}</SectionLabel>
            <h2 className="section-title mt-4">{t('discovery.title')}</h2>
            <p className="lede">{t('discovery.body')}</p>
            <p className="mt-4 max-w-prose text-body text-content-secondary">{t('discovery.tap')}</p>
            <p className="mt-4">
              <DoorLink href={ROUTES.forBuyers} label={t('discovery.link')} event="buyer_door_clicked" />
            </p>
          </div>
          <ExampleScenes />
        </div>
      </section>

      {/* Public storefronts */}
      <section className="section bg-surface-2">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-2">
            <SectionLabel>{t('storefront.label')}</SectionLabel>
            <h2 className="section-title mt-4">{t('storefront.title')}</h2>
            <p className="lede">{t('storefront.body')}</p>
            <p className="mt-4">
              <DoorLink href={ROUTES.forSellers} label={t('storefront.link')} event="seller_door_clicked" />
            </p>
          </div>
          <ExampleStorefront />
        </div>
      </section>

      {/* Trust */}
      <section className="section">
        <div className="container-page">
          <SectionHeader label={t('trust.label')} title={t('trust.title')} />
          <PhotoSlot
            brief={t('trust.photoBrief')}
            tone="stone"
            className="mx-auto mt-10 aspect-[4/3] max-w-5xl sm:aspect-[12/5]"
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((item) => (
              <li key={item.title} className="card">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-body">{item.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center">
            <Link href={ROUTES.trustAndSafety} className="btn-outline">
              {t('trust.link')}
            </Link>
          </p>
        </div>
      </section>

      {/* The journey */}
      <section className="section bg-brand-muted">
        <div className="container-page">
          <SectionHeader label={t('journey.label')} title={t('journey.title')} />
          {/* A real sequence, so an ordered list. It wraps rather than scrolls:
              the prototype's horizontal strip clipped its first steps. */}
          <ol className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
            {steps.map((step, i) => (
              <li key={step} className="rounded-2xl border border-border bg-surface p-4">
                <span aria-hidden className="tnum block font-mono text-label font-medium text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mt-2 block text-body-s font-semibold text-content">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center">
            <Link href={ROUTES.howItWorks} className="btn-text">
              {t('journey.link')}
            </Link>
          </p>
        </div>
      </section>

      {/* Availability. The link to the Availability page joins when that route
          exists (WEB-MIG-005); a link to a 404 would be worse than none. */}
      <section className="section">
        <div className="container-page text-center">
          <SectionHeader label={t('availability.label')} title={t('availability.title')} />
          <p className="mx-auto mt-5 max-w-prose text-body-l text-content-secondary">
            {t('availability.body')}
          </p>
        </div>
      </section>

      {/* Seller call to action */}
      <section className="bg-brand py-14 md:py-[4.5rem]">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <h2 className="text-display-s text-on-brand md:text-display-m">{t('cta.title')}</h2>
            <p className="mt-4 max-w-md text-body-l text-on-brand/90">{t('cta.body')}</p>
            <div className="cta-group">
              <Link href={WAITLIST_HREF} className="btn-inverted">
                {nav('waitlistCta')}
              </Link>
            </div>
          </div>
          <PhotoSlot brief={t('cta.photoBrief')} framed={false} className="aspect-[4/3]" />
        </div>
      </section>
    </>
  );
}

/** The prototype's centred section opening: an eyebrow pill above an H2. */
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="text-center">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="section-title mx-auto mt-4 max-w-3xl">{title}</h2>
    </div>
  );
}

/**
 * The hero photograph, shown as a Scene: a tag on the image and the tagged
 * Product beside it. The card is an EXAMPLE — no real Seller, price or Trust
 * level is implied.
 */
async function HeroScene() {
  const t = await getTranslations('home.hero');
  const common = await getTranslations('common');

  return (
    <div className="relative">
      <PhotoSlot brief={t('photoBrief')} tone="clay" className="aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]" />
      {/* The tag on the photograph. Decorative: the card below says what it is. */}
      <span
        aria-hidden
        className="absolute start-[42%] top-[46%] block h-4 w-4 rounded-full border-2 border-on-brand bg-brand shadow-elevated"
      />
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-surface/95 p-4 shadow-elevated sm:inset-x-auto sm:end-5 sm:w-80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-example">{common('exampleTag')}</span>
          <span className="text-body-s text-content-secondary">{t('exampleScene')}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <PhotoSlot tone="sand" framed={false} className="aspect-square w-14 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="text-label font-mono font-medium uppercase text-content-secondary">{t('exampleTagged')}</p>
            <p className="font-semibold text-content">{t('exampleProduct')}</p>
            <p className="text-body-s text-success">{t('exampleStatus')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Two For You Scenes, each with its tagged-Product count. Invented, so marked. */
async function ExampleScenes() {
  const t = await getTranslations('home.discovery');
  const common = await getTranslations('common');
  const scenes = t.raw('examples') as ExampleScene[];
  const tones = ['clay', 'sage'] as const;

  return (
    <ul className="grid grid-cols-2 gap-4">
      {scenes.map((scene, i) => (
        <li key={scene.title} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <PhotoSlot tone={tones[i % tones.length]} framed={false} className="aspect-[4/5] rounded-none" />
          <div className="p-4">
            <span className="badge-example">{common('exampleTag')}</span>
            <p className="mt-2 font-semibold text-content">{scene.title}</p>
            <p className="mt-1 text-body-s text-content-secondary">{scene.tags}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A public storefront's header and first Products. Invented, so marked. */
async function ExampleStorefront() {
  const t = await getTranslations('home.storefront');
  const common = await getTranslations('common');
  const products = t.raw('exampleProducts') as string[];
  const tones = ['clay', 'sand', 'stone', 'sage'] as const;

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-elevated sm:p-6 lg:order-1">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-muted font-display font-semibold text-brand">
          {t('exampleInitials')}
        </span>
        <p className="font-semibold text-content">{t('exampleName')}</p>
        <span className="badge-example">{common('exampleTag')}</span>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3">
        {products.map((product, i) => (
          <li key={product}>
            <PhotoSlot tone={tones[i % tones.length]} framed={false} className="aspect-square rounded-2xl" />
            <p className="mt-2 text-body-s font-medium text-content">{product}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
