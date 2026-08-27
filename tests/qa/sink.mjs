// Local delivery sink for the QA run. localhost only.
//
// It now keeps what it receives, because Checkpoint 3 asserts on the shape of
// the delivered record — the retention column, the platform enum, the discarded
// second handle — and none of that is visible from the page.
//
//   POST /            accept a submission
//   GET  /records     everything received, newest last
//   POST /reset       forget everything
//
// Nothing is persisted to disk and the process is started and stopped by
// Playwright, so records live only as long as the run.
import http from 'node:http';

const PORT = Number(process.env.QA_SINK_PORT ?? 4556);
const records = [];

http
  .createServer((req, res) => {
    const json = (body, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && req.url.startsWith('/records')) {
      req.resume();
      return json({ records });
    }

    if (req.method === 'POST' && req.url.startsWith('/reset')) {
      req.resume();
      records.length = 0;
      return json({ ok: true });
    }

    // Anything that is not a POST is a readiness probe, not a submission.
    // Playwright's webServer polls GET / until the sink answers, and an earlier
    // version of this file fell through to the body reader on those — pushing an
    // `{unparseable: ''}` record for every poll and breaking every assertion that
    // read the first record.
    if (req.method !== 'POST') {
      req.resume();
      return json({ ok: true });
    }

    let body = '';
    req.on('data', (chunk) => {
      // A submission is ~1.3 KB. Anything wildly larger is not something this
      // sink should be buffering.
      if (body.length < 100_000) body += chunk;
    });
    req.on('end', () => {
      try {
        records.push(JSON.parse(body));
      } catch {
        records.push({ unparseable: body.slice(0, 200) });
      }
      json({ ok: true });
    });
  })
  .listen(PORT, () => console.log(`qa sink on :${PORT}`));
