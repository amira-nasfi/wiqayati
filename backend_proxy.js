const http = require('http');

const PORT = 8008;
const TARGET_PORT = 8000;
const TARGET_HOST = '127.0.0.1';

const server = http.createServer((clientReq, clientRes) => {
  console.log(`[PROXY REQ] ${new Date().toISOString()} ${clientReq.method} ${clientReq.url}`);
  // CORS headers just in case
  clientRes.setHeader('Access-Control-Allow-Origin', '*');
  clientRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  clientRes.setHeader('Access-Control-Allow-Headers', '*');

  if (clientReq.method === 'OPTIONS') {
    clientRes.writeHead(204);
    clientRes.end();
    return;
  }

  const cleanHeaders = { ...clientReq.headers };
  delete cleanHeaders['host'];

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...cleanHeaders,
      host: `${TARGET_HOST}:${TARGET_PORT}`,
      'x-forwarded-host': clientReq.headers['host'] || '',
    },
  };

  const proxy = http.request(options, (targetRes) => {
    clientRes.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(clientRes, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('[Proxy Error]', err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ erreur: 'Proxy error: ' + err.message }));
    }
  });

  clientReq.pipe(proxy, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WIQAYATI PROXY] Listening on http://0.0.0.0:${PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});
