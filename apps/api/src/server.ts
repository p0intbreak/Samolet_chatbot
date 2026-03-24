import { createServer as createHttpServer } from 'node:http';
import { searchProjects } from './modules/search/search.service';
import { parseSearchQuery } from './modules/chat/chat.service';
import type { SearchQueryInput } from '@samolyot-finder/shared-types';

export function createServer() {
  return createHttpServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (request.method === 'POST' && request.url === '/api/chat/message') {
      const body = await readJsonBody<SearchQueryInput>(request);
      const preferences = parseSearchQuery(body.message);
      const result = searchProjects(preferences);

      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Route not found' }));
  });
}

function readJsonBody<T>(request: import('node:http').IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}') as T);
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

