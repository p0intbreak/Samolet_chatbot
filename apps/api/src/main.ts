import { createServer } from './server';

const port = Number(process.env.PORT ?? 4000);
const server = createServer();

server.listen(port, () => {
  console.log(`Samolyot Finder API listening on http://localhost:${port}`);
});

