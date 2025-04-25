import { wrap, clamp } from './util';
import {
  getImageDataFromSrcEl,
  generateViewTransform
} from './scope.js';
import { GLScopeViewer } from './webgl.js';

const FORCE_SRGB = true;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type TransformProps = {
  worldScale: { x: number, y: number, z: number },
  scopeCenter: { x: number, y: number, z: number },
};

type ColorSpaceName = 'xyY' | 'sRGB';

const transformProperties: Record<ColorSpaceName, TransformProps>  = {
  sRGB: {
    worldScale: { x: 1, y: 1, z: 1 },
    scopeCenter: { x: 0.5, y: 0.5, z: 0.5 },
  },
  xyY: {
    worldScale: { x: 3, y: 3, z: 1 },
    scopeCenter: { x: 0.3127, y: 0.329, z: 0.4 },
  }
}


function html<T extends Element>(strings, ...keys) {
  const htmlString = strings.map((str, index) => `${str}${keys[index] || ''}`.trim()).join('').trim();
  const doc = new DOMParser().parseFromString(htmlString, "text/html");
  return doc.children[0].children[1].children[0] as T;
}

export class ImageScope {
  private srcEl?: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

  private colorSpace: ColorSpaceName = 'xyY';
  private worldScaleMultiplier = 1;
  private pointUpdateIntervalRef: number | null = null;

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

  private enablePerspective = false;

  private scopeSize = 512;
  private samplingResolution = 512;
  private elementIndex = 0;
  private useP3 = false;
  private dpr = window.devicePixelRatio;

  private resultEl: HTMLCanvasElement;
  private draggerEl: HTMLElement;
  private containerEl: HTMLDivElement;
  private imagePreviewEl: HTMLCanvasElement;

  viewer: GLScopeViewer;

  private scopeCtx?: WebGL2RenderingContext;
  private sourceCtx?: CanvasRenderingContext2D;

  constructor() {

    this.containerEl = this.createContainerEl();
    this.resultEl = this.createResultEl();
    this.imagePreviewEl = html`<canvas></canvas>`;

    this.draggerEl = this.createDraggerEl();
    const closeEl = this.createButtonEl(
      '#ff3322',
      () => this.hide(),
      'X',
      'Close scope',
    );
    // const prevEl = this.createButtonEl(
    //   '#aaa',
    //   () => this.prevElement(),
    //   '<',
    //   'Previous element',
    // );
    // const nextEl = this.createButtonEl(
    //   '#aaa',
    //   () => this.nextElement(),
    //   '>',
    //   'Next element',
    // );
    const sRGBButton = this.createButtonEl(
      '#aaa',
      () => this.setColorSpace('sRGB'),
      's',
      'Set colorspace: sRGB',
    );
    const perspectiveButton = this.createButtonEl(
      '#aaa',
      () => this.togglePerspective(),
      'P',
      'Toggle Perspective',
    );
    const pickerButton = this.createButtonEl(
      '#aaa',
      () => this.pickTarget(),
      'Q',
      'Pick target',
    );
    const xyYButton = this.createButtonEl(
      '#aaa',
      () => this.setColorSpace('xyY'),
      'Y',
      'Set colorspace: xyY',
    );

    const buttonContainer = this.createButtonContainerEl();

    buttonContainer.appendChild(this.draggerEl);
    // buttonContainer.appendChild(prevEl);
    // buttonContainer.appendChild(nextEl);
    buttonContainer.appendChild(sRGBButton);
    buttonContainer.appendChild(xyYButton);
    buttonContainer.appendChild(perspectiveButton);
    buttonContainer.appendChild(pickerButton);
    buttonContainer.appendChild(closeEl);

    this.containerEl.appendChild(this.resultEl);
    this.containerEl.appendChild(buttonContainer);

    // this.setActiveElement(this.findActiveElement());



    // if (!this.srcEl) {
    //   throw new Error();
    // };
    if (!this.scopeCtx) {
      this.scopeCtx = this.createWebGLContext();
    }
    if (!this.sourceCtx) {
      this.sourceCtx = this.createSourceCtx();
    }
    this.viewer = new GLScopeViewer(this.scopeCtx, this.useP3);
  }

  private setColorSpace(space: ColorSpaceName) {
    this.colorSpace = space;
  }

  private togglePerspective() {
    this.enablePerspective = !this.enablePerspective;
  }

  private async pickTarget() {
    await sleep(10);
    const handlerFn = (e) => {
      console.log(e.target);
      // TODO: Validate target element, don't remove listener if invalid
      this.setActiveElement(e.target);
      document.removeEventListener('click', handlerFn);
    };
    document.addEventListener('click', handlerFn);
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

  // private nextElement() {
  //   this.elementIndex++;
  //   this.setActiveElement(this.findActiveElement());
  // }

  // private prevElement() {
  //   this.elementIndex = Math.max(0, this.elementIndex - 1);
  //   this.setActiveElement(this.findActiveElement());
  // }

  // private findActiveElement(): HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | undefined {
  //   return document.querySelectorAll('img, video, canvas')[this.elementIndex] as any;
  // }

  async init() {
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
      transformProperties[this.colorSpace].scopeCenter,
      this.vec3Mult(transformProperties[this.colorSpace].worldScale, this.worldScaleMultiplier),
      this.enablePerspective ? 0.4 : 0,
    );
    this.viewer.renderScope(viewTransform, this.colorSpace);
  };

  private vec3Mult({x, y, z}: {x: number, y: number, z: number}, m: number) {
    return {
      x: x * m,
      y: y * m,
      z: z * m,
    }
  }

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
        background-color: #00000044;
        overflow: hidden;
        border: 1px solid #000000A0;
        border-radius: 4px;
      "></div>
    `;
  }

  private createDraggerEl() {
    const draggerEl: HTMLButtonElement = html`<button style="
      width: 24px;
      height: 24px;
      background-color: #88aaff;
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: grab;
      border-radius: 4px;
      " title="Move window">✥</button>
    `;

    // TODO: Handle leak 
    draggerEl.addEventListener('mousedown', (e: any) => this.onDraggerMouseDown(e));
    return draggerEl;
  }

  private createButtonContainerEl() {
    return html`<div style="
      position: absolute;
      top: 4px;
      left: 4px;
      height: 24px;
      display: flex;
      flex-direction: row;
      border-radius: 4px;
      gap: 4px;
    "></div>`;
  }

  private createButtonEl(
    color: string,
    callback: () => void,
    label = '',
    tooltip = ''
    ): HTMLDivElement {
    const buttonEl: HTMLDivElement = html`<button style="
      width: 24px;
      height: 24px;
      background-color: ${color};
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
      " title="${tooltip}">${label}</button>
    `;
    buttonEl.addEventListener('click', callback);
    return buttonEl;
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
    if (FORCE_SRGB) {
      return this.imagePreviewEl.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true })!;
    }
    const ctx = this.imagePreviewEl.getContext('2d', { colorSpace: 'display-p3', willReadFrequently: true })!;
    const imageData = ctx.getImageData(0, 0, 1, 1);
    // @ts-ignore
    this.useP3 = imageData.colorSpace === 'display-p3';
    return ctx;
  }

  private onDraggerMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.draggerEl.style.cursor = 'grabbing';
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
    this.draggerEl.style.cursor = 'grab';
    document.removeEventListener('mousemove', this.onDraggerMouseMove);
  };

  private onScopeMouseWheel = (e: WheelEvent) => {
    e.preventDefault();
    const scale = -e.deltaY / 1000;
    this.worldScaleMultiplier *= 1.0 + scale;
    return false;
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
