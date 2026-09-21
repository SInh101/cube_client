// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CubeCameraRig } from './cubeCameraRig';

const rigs: CubeCameraRig[] = [];
afterEach(() => {
  for (const rig of rigs) rig.detach();
  rigs.length = 0;
  document.body.replaceChildren();
});

function canvas() {
  const element = document.createElement('canvas');
  Object.defineProperty(element, 'clientHeight', { value: 480 });
  element.setPointerCapture = vi.fn();
  element.releasePointerCapture = vi.fn();
  document.body.append(element);
  return element;
}

function drag(element: HTMLElement) {
  for (const [type, x] of [
    ['pointerdown', 100],
    ['pointermove', 180],
    ['pointerup', 180],
  ] as const) {
    element.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: x,
        clientY: 100,
        bubbles: true,
      }),
    );
  }
}

function setup() {
  const rig = new CubeCameraRig();
  rigs.push(rig);
  const element = canvas();
  const render = vi.fn();
  rig.attach(element, render);
  return { rig, element, render };
}

describe('independent cube camera', () => {
  it('allows rotation and zoom only while free camera is enabled', () => {
    const { rig, element, render } = setup();
    const original = rig.camera.position.clone();
    drag(element);
    expect(rig.camera.position.distanceTo(original)).toBeLessThan(1e-10);
    rig.configure('UFR', true);
    drag(element);
    expect(rig.camera.position.distanceTo(original)).toBeGreaterThan(1);
    expect(rig.camera.position.length()).toBeCloseTo(original.length());
    const distance = rig.camera.position.length();
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    expect(rig.camera.position.length()).toBeLessThan(distance);
    expect(render).toHaveBeenCalled();
  });

  it('retains the free viewpoint when cube scene rendering is recreated', () => {
    const { rig, element, render } = setup();
    rig.configure('UFR', true);
    drag(element);
    const position = rig.camera.position.clone();
    const orientation = rig.camera.quaternion.clone();
    rig.detach();
    render.mockClear();
    drag(element);
    expect(render).not.toHaveBeenCalled();
    const next = canvas();
    rig.attach(next, vi.fn());
    rig.configure('UFR', true);
    expect(rig.camera.position.distanceTo(position)).toBeLessThan(1e-10);
    expect(rig.camera.quaternion.angleTo(orientation)).toBeLessThan(1e-7);
    expect(next.style.touchAction).toBe('none');
  });

  it('returns to the selected preset and stops drag/zoom when switched off', () => {
    const { rig, element } = setup();
    rig.configure('DBL', true);
    const preset = rig.camera.position.clone();
    drag(element);
    rig.configure('DBL', false);
    expect(rig.camera.position.distanceTo(preset)).toBeLessThan(1e-10);
    drag(element);
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    expect(rig.camera.position.distanceTo(preset)).toBeLessThan(1e-10);
    expect(element.style.touchAction).toBe('auto');
  });
});
