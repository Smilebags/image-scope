import { wrap, clamp } from './util';
import {
  getImageDataFromSrcEl,
  generateViewTransform
} from './scope.js';
import { GLScopeViewer } from './webgl.js';
import { html } from './main';

export class ImageScope {
  private srcEl?: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

  private worldScale = { x: 3, y: 3, z: 1 };
  private scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 };
  private pointUpdateIntervalRef = null;

  private rotation = {
    x: 0.5,
    y: 1,
  };

  private mouse = {
    x: 0,
    y: 0,
  };

  private draggerState = {
    downMousePos: {
      x: 0,
      y: 0,
    },
    downElPos: {
      x: 0,
      y: 0,
    },
  };
  private perspectiveStrength = 0;

  private scopeSize = 512;
  private samplingResolution = 512;
  private elementIndex = 0;
  private useP3 = false;
  private dpr = window.devicePixelRatio;

  private resultEl: HTMLCanvasElement;
  private containerEl: HTMLDivElement;
  private imagePreviewEl: HTMLCanvasElement;

  viewer?: GLScopeViewer;

  private scopeCtx?: WebGL2RenderingContext;
  private sourceCtx?: CanvasRenderingContext2D;

  constructor() {
    this.containerEl = this.createContainerEl();
    this.resultEl = this.createResultEl();
    this.imagePreviewEl = html`<canvas></canvas>`;

    const draggerEl = this.createDraggerEl();
    const closeEl = this.createCloseEl();

    this.containerEl.appendChild(draggerEl);
    this.containerEl.appendChild(closeEl);
    this.containerEl.appendChild(this.resultEl);

    document.addEventListener('keydown', this.onScopeKeydown);

    this.setActiveElement(document.querySelectorAll('img, video')[this.elementIndex] as any);
  }

  show() {
    document.body.appendChild(this.containerEl);
    this.startPointUpdateLoop();
    this.showSrcElBorder();
    this.render();
  }

  hide() {
    this.containerEl.remove();
    this.stopPointUpdateLoop();
    this.hideSrcElBorder();
  }

  setActiveElement(el: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) {
    this.hideSrcElBorder();
    // @ts-ignore
    el.crossOrigin = 'anonymous';
    this.srcEl = el;
    this.showSrcElBorder();
  }

  async init() {
    if (!this.srcEl) {
      throw new Error();
    };
    if (!this.scopeCtx) {
      this.scopeCtx = this.createWebGLContext();
    }
    if (!this.sourceCtx) {
      this.sourceCtx = this.createSourceCtx();
    }
    this.viewer = new GLScopeViewer(this.scopeCtx, this.useP3);
    await this.viewer.init();
  }

  private render = () => {
    if (!this.pointUpdateIntervalRef) {
      return;
    }
    requestAnimationFrame(this.render);
    const viewTransform = generateViewTransform(
      this.rotation.x,
      this.rotation.y,
      this.scopeCenter,
      this.worldScale,
      this.perspectiveStrength
    );
    this.viewer.renderScope(viewTransform);
  };

  private createResultEl() {
    const resultEl: HTMLCanvasElement = html`<canvas style="width: 100%; height: 100%;"></canvas>`;
    resultEl.width = this.scopeSize * this.dpr;
    resultEl.height = this.scopeSize * this.dpr;
    resultEl.addEventListener('mousedown', this.onScopeMouseDown);
    resultEl.addEventListener('wheel', this.onScopeMouseWheel);

    return resultEl;
  }

  private createContainerEl(): HTMLDivElement {
    return html`
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: ${this.scopeSize}px;
        height: ${this.scopeSize}px;
        z-index: 1000000;
        background-color: #00000022;
      "></div>
    `;
  }

  private createCloseEl() {
    const closeEl = html`<div style="
      position: absolute;
      top: 0;
      left: 16px;
      width: 16px;
      height: 16px;
      background-color: #ff0000;
      "></div>
    `;

    // TODO: Handle leak 
    closeEl.addEventListener('click', () => this.hide());
    return closeEl;
  }

  private createDraggerEl() {
    const draggerEl = html`<div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 16px;
      height: 16px;
      background-color: #0000ff;
      "></div>
    `;

    // TODO: Handle leak 
    draggerEl.addEventListener('mousedown', (e: any) => this.onDraggerMouseDown(e));
    return draggerEl;
  }

  private createWebGLContext() {
    const ctx = this.resultEl.getContext('webgl2');
    if (!ctx) {
      alert('Your browser does not support WebGL2');
      throw new Error();
    }
    return ctx;
  }

  private createSourceCtx() {
    const ctx = this.imagePreviewEl.getContext('2d', { colorSpace: 'display-p3' });
    const imageData = ctx.getImageData(0, 0, 1, 1);
    // @ts-ignore
    this.useP3 = imageData.colorSpace === 'display-p3';
    return ctx;
  }

  private onDraggerMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    this.draggerState.downMousePos = { x: clientX, y: clientY };
    this.draggerState.downElPos = { x: this.containerEl.offsetLeft, y: this.containerEl.offsetTop };

    document.addEventListener('mousemove', this.onDraggerMouseMove);
    document.addEventListener('mouseup', this.onDraggerMouseUp, { once: true });
  }

  private onDraggerMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    const { downMousePos, downElPos } = this.draggerState;
    const deltaX = clientX - downMousePos.x;
    const deltaY = clientY - downMousePos.y;
    this.containerEl.style.left = `${downElPos.x + deltaX}px`;
    this.containerEl.style.top = `${downElPos.y + deltaY}px`;
  };

  private onDraggerMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.removeEventListener('mousemove', this.onDraggerMouseMove);
  };

  private onScopeMouseWheel = (e: WheelEvent) => {
    e.preventDefault();
    const scale = -e.deltaY / 1000;
    this.worldScale.x *= 1.0 + scale;
    this.worldScale.y *= 1.0 + scale;
    this.worldScale.z *= 1.0 + scale;
    return false;
  };

  private onScopeKeydown = (e: KeyboardEvent) => {
    const perspectiveIncrement = 0.25;

    if (e.key === 'z') {
      this.perspectiveStrength += perspectiveIncrement;
    } else if (e.key === 'x') {
      this.perspectiveStrength -= perspectiveIncrement;
    } else if (e.key === 'v') {
      this.elementIndex += 1;
      this.setActiveElement(document.querySelectorAll('img, video')[this.elementIndex] as any);
    } else if (e.key === 'c') {
      this.elementIndex = Math.max(0, this.elementIndex - 1);
      this.setActiveElement(document.querySelectorAll('img, video')[this.elementIndex] as any);
    }
  };

  private onScopeMouseDown = (e: MouseEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    window.addEventListener('mousemove', this.onScopeMouseMove);
    window.addEventListener('mouseup', this.onScopeMouseUp, { once: true });
  };

  private onScopeMouseMove = (e) => {
    const relativeX = e.clientX - this.mouse.x;
    const relativeY = e.clientY - this.mouse.y;
    this.rotation.x += 0.001 * relativeX;
    this.rotation.y += 0.001 * relativeY;
    this.rotation.x = wrap(this.rotation.x, 0, 1);
    this.rotation.y = clamp(this.rotation.y, 0, 1);
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  private onScopeMouseUp = () => {
    window.removeEventListener('mousemove', this.onScopeMouseMove);
  };

  private startPointUpdateLoop() {
    if (this.pointUpdateIntervalRef) {
      return;
    }
    this.pointUpdateIntervalRef = setInterval(() => this.updatePoints(), 1000 / 25);
    this.updatePoints();
  }

  private stopPointUpdateLoop() {
    if (!this.pointUpdateIntervalRef) {
      return;
    }
    clearInterval(this.pointUpdateIntervalRef);
    this.pointUpdateIntervalRef = null;
  }

  private updatePoints() {
    const previewImageData = getImageDataFromSrcEl(this.srcEl, this.sourceCtx, this.samplingResolution);
    this.viewer.setBufferData(previewImageData.data);
  }

  private hideSrcElBorder() {
    if (!this.srcEl) {
      return;
    }
    this.srcEl.style.outline = 'none';
  }

  private showSrcElBorder() {
    if (!this.srcEl) {
      return;
    }
    this.srcEl.style.outline = '2px solid red';
  }
}
