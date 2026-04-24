import { createServer } from 'node:http';
import { loadServerConfig } from './config.js';
import { FileSchedulerStore } from './store/fileSchedulerStore.js';
import { createServerApp } from './app.js';

const config = loadServerConfig();
const store = new FileSchedulerStore(config.dataFilePath);
const app = createServerApp(config, store);
const server = createServer(app);

server.listen(config.port, () => {
  console.log(`Kanji Grid review scheduler server listening on http://localhost:${config.port}`);
});
