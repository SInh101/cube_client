import { handleCubeRequest } from './http/handleCubeRequest.js';
import { handlePresetRequest } from './http/handlePresetRequest.js';
import { handleCommutatorRequest } from './http/handlers/handleCommutatorRequest.js';
import { handleMoveSequenceRequest } from './http/handlers/handleMoveSequenceRequest.js';

type Handler = (request: Request) => Promise<Response> | Response;

const routes: Readonly<Record<string, Handler>> = {
  '/api/commutators': (request) => handleCommutatorRequest(request),
  '/api/move-sequences': handleMoveSequenceRequest,
};

/** AppのREST境界を保ちつつ、対象requestをブラウザ内で処理する。 */
export function installLocalApi(): void {
  const networkFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const source = input instanceof Request ? input.url : String(input);
    const url = new URL(source, globalThis.location.href);
    if (!url.pathname.startsWith('/api/')) return networkFetch(input, init);

    const request =
      input instanceof Request
        ? new Request(url, init ?? input)
        : new Request(url, init);
    if (url.pathname.startsWith('/api/cubes')) {
      return handleCubeRequest(request);
    }
    if (url.pathname.startsWith('/api/presets')) {
      return handlePresetRequest(request);
    }
    const handler = routes[url.pathname];
    return handler === undefined
      ? Response.json(
          { error: { code: 'RESOURCE_NOT_FOUND', message: 'Not found' } },
          { status: 404 },
        )
      : handler(request);
  };
}
