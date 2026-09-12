import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/auth/phone/')) {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const pathname = url.pathname;

          if (pathname === '/api/auth/phone/request' || pathname === '/api/auth/phone/verify') {
            const modulePath = pathname.endsWith('request')
              ? '/api/auth/phone/request.js'
              : '/api/auth/phone/verify.js';

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const mod = await server.ssrLoadModule(modulePath);
                const handler = mod.default;

                const fakeReq: any = req;
                fakeReq.body = body;

                const fakeRes: any = {
                  setHeader: (name: string, value: string) => res.setHeader(name, value),
                  status: (code: number) => {
                    res.statusCode = code;
                    return {
                      json: (data: any) => {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                      },
                      end: () => res.end(),
                    };
                  },
                };

                await handler(fakeReq, fakeRes);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
});
