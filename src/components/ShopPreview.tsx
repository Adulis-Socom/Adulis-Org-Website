import { getTranslations } from 'next-intl/server';

type Step = { title: string; body: string };

/**
 * W01's "From bio link to product" band: bio → storefront → product.
 *
 * The EXAMPLE badge belongs on each of these three and on nothing else. The
 * seller name, price, stock time, level and order count are invented, and a
 * reader has to be able to tell that at a glance.
 *
 * It must never appear beside the trust ladder on Trust & Safety: New,
 * Established and Trusted are the real level names, and only their thresholds
 * are undecided.
 */
export async function ShopPreview() {
  const t = await getTranslations('home');
  const common = await getTranslations('common');
  const steps = t.raw('bioToProduct.steps') as Step[];

  return (
    <section className="card-sunken" aria-label={t('bioToProduct.title')}>
      <h2 className="text-h3 text-ink">{t('bioToProduct.title')}</h2>

      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col">
            <div className="card">
              <span className="badge-example">{common('exampleTag')}</span>
              <h3 className="card-title mt-2">{step.title}</h3>
              <p className="card-body">{step.body}</p>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="select-none py-1 text-center text-h3 font-semibold text-ink-muted"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
