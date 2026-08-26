/**
 * Event call sites, with no transport behind them yet.
 *
 * Checkpoint 4 decides how events leave this site: self-hosted, server-side
 * emission preferred, and no third party in the path -- the site collects
 * personal data from prospective sellers, and adding a processor nobody has
 * assessed is a standing rule in SECURITY.md, not a preference.
 *
 * This module exists now so that call sites can be written where the behaviour
 * is, rather than retrofitted later by someone hunting for the right component.
 * `track()` deliberately does nothing. It is not a queue, and it does not buffer
 * for a future transport -- a buffer implies events survive until the transport
 * arrives, and these do not.
 *
 * ## Why a no-op instead of waiting
 *
 * `language_switched` is the case that forced it. The switcher is built now but
 * hidden behind `AM_ENABLED`, so the event measures nothing until the flag
 * flips. That is honest: the question it answers -- whether Amharic is a
 * courtesy or a requirement -- cannot be answered by a control that currently
 * delivers English either way.
 *
 * ⚠ Do not add a network call here. When Checkpoint 4 implements this, events
 * that carry anything about a person go server-side, and the decision about what
 * may be attached to an event is made there.
 */

/** Events this site emits. Adding one is a decision, so they are enumerated. */
export type AnalyticsEvent =
  | 'language_switched'
  | 'waitlist_submitted'
  | 'waitlist_validation_failed';

/**
 * Records that something happened. Currently does nothing at all.
 *
 * Properties must not carry anything identifying. A locale code is fine; a phone
 * number, a handle or a reference number is not.
 */
export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>): void {
  // No transport yet — see the module comment. Intentionally not a console.log:
  // a site that prints its analytics to the browser console in production is
  // telling every visitor what it measures.
  void event;
  void properties;
}
