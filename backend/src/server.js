import { createApp } from './app.js';
import { connectDb } from './lib/db.js';
import { config } from './config.js';

await connectDb();
createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
