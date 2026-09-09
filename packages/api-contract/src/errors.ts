export const API_ERROR_CODES = [
  'RESOURCE_NOT_FOUND',
  'IDENTIFIER_NOT_CORRECT',
  'JSON_NOT_CORRECT',
  'METHOD_NOT_ALLOWED',
  'INTERNAL_SERVER_ERROR',
  'REQUEST_NOT_CORRECT',
  'MOVE_NOT_CORRECT',
  'SEQUENCE_NOT_CORRECT',
  'UNSUPPORTED_MEDIA_TYPE',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ErrorDetailDto {
  readonly field: string;
  readonly reason: string;
}

export interface ErrorResponseDto {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly details?: readonly ErrorDetailDto[];
  };
}
