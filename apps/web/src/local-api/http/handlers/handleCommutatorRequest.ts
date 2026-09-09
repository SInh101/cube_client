import type {
  ApiErrorCode,
  CommutatorRequestDto,
  ErrorDetailDto,
  ErrorResponseDto,
} from '@rubiks-learning/api-contract';

import {
  applyCommutatorToCube,
  CommutatorInputError,
  CubeNotFoundError,
  prepareCommutator,
} from '../../application/index.js';

/** Cubeに従属するCommutator commandのHTTP境界。 */
export async function handleCommutatorRequest(
  request: Request,
  cubeId?: string,
): Promise<Response> {
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return errorResponse(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      'JSON_NOT_CORRECT',
      'Request body must be valid JSON',
    );
  }

  if (!isCommutatorRequestDto(body)) {
    return errorResponse(
      400,
      'REQUEST_NOT_CORRECT',
      'Request body must contain only string fields a and b',
    );
  }

  try {
    const dto =
      cubeId === undefined
        ? prepareCommutator(body.a, body.b)
        : await applyCommutatorToCube(cubeId, body.a, body.b);
    return Response.json(dto, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CommutatorInputError) {
      return errorResponse(
        400,
        'SEQUENCE_NOT_CORRECT',
        `${error.part} contains an unsupported Move`,
        [
          {
            field: error.part,
            reason: `token ${error.tokenIndex + 1} is unsupported: ${error.token}`,
          },
        ],
      );
    }
    if (error instanceof CubeNotFoundError) {
      return errorResponse(404, 'RESOURCE_NOT_FOUND', 'Cube not found');
    }
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'internal server error');
  }
}

function isCommutatorRequestDto(body: unknown): body is CommutatorRequestDto {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return false;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 2 &&
    keys[0] === 'a' &&
    keys[1] === 'b' &&
    typeof record.a === 'string' &&
    typeof record.b === 'string'
  );
}

function isJsonContentType(contentType: string | null): boolean {
  return (
    contentType?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json'
  );
}

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: readonly ErrorDetailDto[],
): Response {
  const dto: ErrorResponseDto = {
    error: { code, message, ...(details === undefined ? {} : { details }) },
  };
  return Response.json(dto, { status });
}
