import { createServer } from 'http';
import { request as httpRequest } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// 后端 NestJS 地址 — 本地开发用 localhost:8080，生产用 VPS 公网地址
// 通过 BACKEND_URL 环境变量配置，格式: http://host:port 或 https://host:port
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const backendParsed = new URL(BACKEND_URL);
const BACKEND_HOST = backendParsed.hostname;
const BACKEND_PORT = parseInt(backendParsed.port || (backendParsed.protocol === 'https:' ? '443' : '80'), 10);
const BACKEND_IS_HTTPS = backendParsed.protocol === 'https:';

// 仅属于 NestJS 监管后端的路由前缀 — 转发到后端
// Next.js 自身的 API（AI、NFT 铸造等）直接由 Next.js 处理
const NESTJS_ROUTES = [
  '/api/auth/',
  '/api/did/',
  '/api/ip-assets/',
  '/api/policies/',
  '/api/derivatives/',
  '/api/sync/',
  '/api/audit/',
  '/api/dashboard/',
  '/api/ipfs/',
];

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function proxyApi(req: import('http').IncomingMessage, res: import('http').ServerResponse) {
  const headers = { ...req.headers };
  delete headers['host'];

  const isHttps = BACKEND_IS_HTTPS;
  const httpModule = isHttps ? require('https') : require('http');

  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers,
    rejectUnauthorized: !dev,
  };
  const backendReq = httpModule.request(options, (backendRes: import('http').IncomingMessage) => {
    res.writeHead(backendRes.statusCode!, backendRes.headers);
    backendRes.pipe(res);
  });
  backendReq.on('error', () => {
    res.statusCode = 502;
    res.end('Backend unavailable');
  });
  req.pipe(backendReq);
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      const shouldProxy = NESTJS_ROUTES.some(r => parsedUrl.pathname?.startsWith(r));
      if (shouldProxy) {
        proxyApi(req, res);
        return;
      }
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
