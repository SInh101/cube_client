import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type CubeCameraView = 'UFR' | 'UBL' | 'DFR' | 'DBL';

const CAMERA_POSITIONS: Readonly<
  Record<CubeCameraView, readonly [number, number, number]>
> = {
  UFR: [5.2, 4.2, 6.4],
  UBL: [-5.2, 4.2, -6.4],
  DFR: [5.2, -4.2, 6.4],
  DBL: [-5.2, -4.2, -6.4],
};

/** Observer state only: independent of cube moves and scene reconstruction. */
export class CubeCameraRig {
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private controls: OrbitControls | undefined;
  private element: HTMLElement | undefined;
  private render: (() => void) | undefined;
  private view: CubeCameraView = 'UFR';
  private free = false;

  constructor() {
    this.camera.position.set(...CAMERA_POSITIONS[this.view]);
    this.camera.lookAt(0, 0, 0);
  }

  configure(view: CubeCameraView, free: boolean): void {
    const reset = view !== this.view || (!free && this.free);
    this.view = view;
    this.free = free;
    if (reset) {
      this.camera.position.set(...CAMERA_POSITIONS[view]);
      this.camera.lookAt(0, 0, 0);
    }
    if (this.controls) {
      this.controls.enabled = free;
      this.controls.update();
    }
    if (this.element) this.element.style.touchAction = free ? 'none' : 'auto';
    this.render?.();
  }

  attach(element: HTMLElement, render: () => void): void {
    this.detach();
    this.element = element;
    this.render = render;
    const controls = new OrbitControls(this.camera, element);
    controls.enabled = this.free;
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 6;
    controls.maxDistance = 18;
    controls.rotateSpeed = 0.7;
    controls.addEventListener('change', render);
    element.style.touchAction = this.free ? 'none' : 'auto';
    this.controls = controls;
  }

  detach(): void {
    if (this.controls && this.render) {
      this.controls.removeEventListener('change', this.render);
    }
    this.controls?.dispose();
    this.controls = undefined;
    this.element = undefined;
    this.render = undefined;
  }
}
