// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { installLocalApi } from './installLocalApi';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  localStorage.clear();
});

describe('installLocalApi', () => {
  it('creates, updates, reads, and analyzes a cube without network access', async () => {
    installLocalApi();

    const createResponse = await fetch('/api/cubes', { method: 'POST' });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { cubeId: string };

    const moveResponse = await fetch(`/api/cubes/${created.cubeId}/moves`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moves: ['R', 'U'] }),
    });
    expect(moveResponse.status).toBe(200);
    const moved = (await moveResponse.json()) as {
      states: unknown[];
      state: unknown;
    };
    expect(moved.states).toHaveLength(2);

    const getResponse = await fetch(`/api/cubes/${created.cubeId}`);
    expect(getResponse.status).toBe(200);
    const current = (await getResponse.json()) as { state: unknown };
    expect(current.state).toEqual(moved.state);

    const analysisResponse = await fetch(
      `/api/cubes/${created.cubeId}/analyses`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sequence: "R' D R U2 R' D' R U2" }),
      },
    );
    expect(analysisResponse.status).toBe(200);
  });
});
