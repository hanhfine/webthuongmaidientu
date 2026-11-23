import fs from 'node:fs';
import https from 'node:https';
import { createApp } from './app.js';
import { connectDb } from './lib/db.js';
import { config } from './config.js';
import { startPaymentWorkers } from './services/sepayService.js';

await connectDb();
const app = createApp();
const stopWorkers = config.env !== 'test' ? startPaymentWorkers() : () => {};

let server;
if (config.sslKeyPath && config.sslCertPath && fs.existsSync(config.sslKeyPath) && fs.existsSync(config.sslCertPath)) {
  const tlsOptions = {
    key: fs.readFileSync(config.sslKeyPath),
    cert: fs.readFileSync(config.sslCertPath),
  };
  server = https.createServer(tlsOptions, app).listen(config.port, () => {
    console.log(`HTTPS API listening on https://localhost:${config.port}`);
  });
} else {
  server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

const shutdown = () => {
  stopWorkers();
  server.close(() => process.exit(0));
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
