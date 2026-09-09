import type { ErrorResponseDto } from '@rubiks-learning/api-contract';

import {
  createCube,
  CubeNotFoundError,
  getCube,
  resetCube,
} from '../application/index.js';
import { handleApplyMoveRequest } from './handlers/handleApplyMoveRequest.js';
import { handleCommutatorRequest } from './handlers/handleCommutatorRequest.js';
import { handleSequenceAnalysisRequest } from './handlers/handleSequenceAnalysisRequest.js';
import { isUuid } from '../validation/isUuid.js';

type CubeRoute =
  | { readonly kind: 'collection' }
  | { readonly kind: 'resource'; readonly cubeId: string }
  | { readonly kind: 'reset'; readonly cubeId: string }
  | { readonly kind: 'move'; readonly cubeId: string }
  | { readonly kind: 'commutator'; readonly cubeId: string }
  | { readonly kind: 'analysis'; readonly cubeId: string }
  | { readonly kind: 'unknown' };

/** Cube APIの全URIを単一のVercel Function内で振り分ける。 */
export async function handleCubeRequest(request: Request): Promise<Response> {
  // Local Fetch Requests contain an absolute URL, while the Vercel Node
  // adapter may expose only the request target (for example `/api/cubes`).
  // A base URL makes both forms safe to parse; only pathname/query are used.
  const route = resolveRoute(new URL(request.url, 'http://localhost'));

  if (route.kind === 'unknown') {
    return errorResponse(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  }

  if (!acceptsMethod(route, request.method)) {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  if (route.kind === 'collection') {
    try {
      return Response.json(await createCube(), { status: 201 });
    } catch {
      return internalErrorResponse();
    }
  }

  const cubeId = decodeCubeId(route.cubeId);
  if (cubeId === undefined || !isUuid(cubeId)) {
    return errorResponse(
      400,
      'IDENTIFIER_NOT_CORRECT',
      'cubeId must be a valid UUID',
    );
  }

  try {
    if (route.kind === 'move') {
      return await handleApplyMoveRequest(request, cubeId);
    }
    if (route.kind === 'commutator') {
      return await handleCommutatorRequest(request, cubeId);
    }
    if (route.kind === 'analysis') {
      return await handleSequenceAnalysisRequest(request, cubeId);
    }

    const dto =
      route.kind === 'resource'
        ? await getCube(cubeId)
        : await resetCube(cubeId);
    return Response.json(dto, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CubeNotFoundError) {
      return errorResponse(404, 'RESOURCE_NOT_FOUND', 'Cube not found');
    }

    return internalErrorResponse();
  }
}

function resolveRoute(url: URL): CubeRoute {
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] !== 'api' || segments[1] !== 'cubes') {
    return { kind: 'unknown' };
  }

  if (segments.length === 2) {
    const rewrittenCubeId = url.searchParams.get('cubeId');
    if (rewrittenCubeId === null) return { kind: 'collection' };

    const operation = url.searchParams.get('operation');
    if (operation === 'reset')
      return { kind: 'reset', cubeId: rewrittenCubeId };
    if (operation === 'move') return { kind: 'move', cubeId: rewrittenCubeId };
    if (operation === 'commutator') {
      return { kind: 'commutator', cubeId: rewrittenCubeId };
    }
    if (operation === 'analysis')
      return { kind: 'analysis', cubeId: rewrittenCubeId };
    return { kind: 'resource', cubeId: rewrittenCubeId };
  }

  if (segments.length === 3) {
    const cubeId = segments[2];
    return cubeId === undefined
      ? { kind: 'unknown' }
      : { kind: 'resource', cubeId };
  }

  if (segments.length === 4) {
    const cubeId = segments[2];
    if (cubeId === undefined) return { kind: 'unknown' };
    if (segments[3] === 'reset') return { kind: 'reset', cubeId };
    if (segments[3] === 'moves') return { kind: 'move', cubeId };
    if (segments[3] === 'commutators') return { kind: 'commutator', cubeId };
    if (segments[3] === 'analyses') return { kind: 'analysis', cubeId };
  }

  return { kind: 'unknown' };
}

function acceptsMethod(route: CubeRoute, method: string): boolean {
  return (
    (route.kind === 'collection' && method === 'POST') ||
    (route.kind === 'resource' && method === 'GET') ||
    (route.kind === 'reset' && method === 'PUT') ||
    ((route.kind === 'move' ||
      route.kind === 'commutator' ||
      route.kind === 'analysis') &&
      method === 'POST')
  );
}

function decodeCubeId(encodedCubeId: string): string | undefined {
  try {
    return decodeURIComponent(encodedCubeId);
  } catch {
    return undefined;
  }
}

function internalErrorResponse(): Response {
  return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'internal server error');
}

function errorResponse(
  status: number,
  code: ErrorResponseDto['error']['code'],
  message: string,
): Response {
  const dto: ErrorResponseDto = { error: { code, message } };
  return Response.json(dto, { status });
}
