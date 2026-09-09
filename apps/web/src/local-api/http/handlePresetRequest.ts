import type {
  CreatePresetRequestDto,
  ErrorResponseDto,
  UpdatePresetRequestDto,
} from '@rubiks-learning/api-contract';
import {
  InvalidPresetError,
  PresetNotFoundError,
} from '../application/PresetErrors.js';
import { PresetService } from '../application/PresetService.js';
import {
  presetRepository,
  type PresetRepository,
} from '../repository/index.js';
import { isUuid } from '../validation/isUuid.js';
export async function handlePresetRequest(
  request: Request,
  repository: PresetRepository = presetRepository,
): Promise<Response> {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  const rewritten = new URL(request.url).searchParams.get('presetId');
  if (segments[0] !== 'api' || segments[1] !== 'presets' || segments.length > 3)
    return error(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  const id = segments[2] ?? rewritten ?? undefined;
  const allowed =
    id === undefined ? ['GET', 'POST'] : ['GET', 'PUT', 'PATCH', 'DELETE'];
  if (!allowed.includes(request.method))
    return error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  if (id !== undefined && !isUuid(id))
    return error(
      400,
      'IDENTIFIER_NOT_CORRECT',
      'presetId must be a valid UUID',
    );
  const service = new PresetService(repository);
  try {
    if (id === undefined && request.method === 'GET')
      return Response.json(await service.list());
    if (id === undefined)
      return Response.json(
        await service.create(await json<CreatePresetRequestDto>(request)),
        { status: 201 },
      );
    if (request.method === 'GET') return Response.json(await service.get(id));
    if (request.method === 'DELETE') {
      await service.delete(id);
      return new Response(null, { status: 204 });
    }
    return Response.json(
      await service.update(id, await json<UpdatePresetRequestDto>(request)),
    );
  } catch (cause: unknown) {
    if (cause instanceof SyntaxError)
      return error(400, 'JSON_NOT_CORRECT', 'Request body must be valid JSON');
    if (cause instanceof InvalidPresetError)
      return error(
        400,
        'REQUEST_NOT_CORRECT',
        'Preset request is not correct',
        [{ field: cause.field, reason: cause.reason }],
      );
    if (cause instanceof PresetNotFoundError)
      return error(404, 'RESOURCE_NOT_FOUND', 'Preset not found');
    return error(500, 'INTERNAL_SERVER_ERROR', 'internal server error');
  }
}
async function json<T>(request: Request): Promise<T> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new InvalidPresetError('content-type', 'must be application/json');
  return request.json() as Promise<T>;
}
function error(
  status: number,
  code: ErrorResponseDto['error']['code'],
  message: string,
  details?: ErrorResponseDto['error']['details'],
) {
  return Response.json(
    {
      error: { code, message, ...(details ? { details } : {}) },
    } satisfies ErrorResponseDto,
    { status },
  );
}
