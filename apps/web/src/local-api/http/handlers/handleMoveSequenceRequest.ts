import type {
  ApiErrorCode,
  ErrorDetailDto,
  ErrorResponseDto,
  MoveSequenceRequestDto,
} from '@rubiks-learning/api-contract';
import { InvalidMoveSequenceError } from '@rubiks-learning/cube-core';
import { prepareMoveSequence } from '../../application/prepareMoveSequence.js';

/**
 * MoveSequence resourceのHTTP境界。
 *
 * method、media type、JSON、DTO shapeを検証し、domain errorを公開errorへ変換する。
 */
export async function handleMoveSequenceRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

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

  if (!isMoveSequenceRequestDto(body)) {
    return errorResponse(
      400,
      'REQUEST_NOT_CORRECT',
      'Request body does not match the required shape',
    );
  }

  try {
    return Response.json(prepareMoveSequence(body.sequence), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InvalidMoveSequenceError) {
      return errorResponse(
        400,
        'SEQUENCE_NOT_CORRECT',
        'sequence contains an unsupported Move',
        [
          {
            field: 'sequence',
            reason: `token ${error.tokenIndex + 1} is unsupported: ${error.token}`,
          },
        ],
      );
    }

    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'internal server error');
  }
}

function isJsonContentType(contentType: string | null): boolean {
  if (contentType === null) return false;
  return (
    contentType.split(';', 1)[0]?.trim().toLowerCase() === 'application/json'
  );
}

function isMoveSequenceRequestDto(
  body: unknown,
): body is MoveSequenceRequestDto {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body);
  return (
    keys.length === 1 &&
    keys[0] === 'sequence' &&
    typeof (body as Record<string, unknown>).sequence === 'string'
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
