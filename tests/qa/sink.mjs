// Local delivery sink for the QA run. localhost only.
import http from 'node:http';
const PORT = Number(process.env.QA_SINK_PORT ?? 4556);
http.createServer((req, res) => { req.resume(); res.writeHead(200, {'content-type':'application/json'}); res.end('{"ok":true}'); })
  .listen(PORT, () => console.log(`qa sink on :${PORT}`));
