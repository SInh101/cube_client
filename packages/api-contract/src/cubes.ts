export type CubeColorDto =
  'white' | 'red' | 'green' | 'yellow' | 'orange' | 'blue';

export type FaceStateDto = readonly [
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
  CubeColorDto,
];

export interface CubeStateResponseDto {
  readonly cubeId: string;
  readonly state: {
    readonly faces: {
      readonly U: FaceStateDto;
      readonly R: FaceStateDto;
      readonly F: FaceStateDto;
      readonly D: FaceStateDto;
      readonly L: FaceStateDto;
      readonly B: FaceStateDto;
    };
  };
}

/** POST /api/cubes の成功レスポンス。作成直後のGETを不要にする。 */
export type CreateCubeResponseDto = CubeStateResponseDto;
