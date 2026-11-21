import fs from 'node:fs';
import https from 'node:https';
import { createApp } from './app.js';
import { connectDb } from './lib/db.js';
import { config } from './config.js';

await connectDb();
const app = createApp();

if (config.sslKeyPath && config.sslCertPath && fs.existsSync(config.sslKeyPath) && fs.existsSync(config.sslCertPath)) {
  const tlsOptions = {
    key: fs.readFileSync(config.sslKeyPath),
    cert: fs.readFileSync(config.sslCertPath),
  };
  https.createServer(tlsOptions, app).listen(config.port, () => {
    console.log(`HTTPS API listening on https://localhost:${config.port}`);
  });
} else {
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}
