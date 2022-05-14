(() => {
  // src/util.js
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function wrap(value, min, max) {
    const range = max - min;
    const offsetValue = value - min;
    const wrappedValue = offsetValue % range + min;
    return wrappedValue;
  }

  // src/math.js
  function mat4Multiply(first, then) {
    const a = first;
    const b = then;
    return [
      a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12],
      a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13],
      a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
      a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],
      a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12],
      a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13],
      a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14],
      a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15],
      a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12],
      a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13],
      a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14],
      a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15],
      a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12],
      a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13],
      a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14],
      a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15]
    ];
  }
  function createRotateXYTransform(angle) {
    return [
      Math.cos(angle),
      -Math.sin(angle),
      0,
      0,
      Math.sin(angle),
      Math.cos(angle),
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ];
  }
  function createRotateYZTransform(angle) {
    return [
      1,
      0,
      0,
      0,
      0,
      Math.cos(angle),
      -Math.sin(angle),
      0,
      0,
      Math.sin(angle),
      Math.cos(angle),
      0,
      0,
      0,
      0,
      1
    ];
  }
  function lerp3(a, b, mix) {
    return {
      r: lerp(a.r, b.r, mix),
      g: lerp(a.g, b.g, mix),
      b: lerp(a.b, b.b, mix)
    };
  }
  function lerp(a, b, mix) {
    return a + (b - a) * mix;
  }

  // src/scope.js
  function getImageDataFromSrcEl(el, ctx, targetResolution) {
    const height = el?.videoHeight || el?.naturalHeight;
    const width = el?.videoWidth || el?.naturalWidth;
    if (el && height && width) {
      const max = Math.max(width, height);
      const fractionOfMax = {
        width: width / max,
        height: height / max
      };
      const elWidth = Math.floor(fractionOfMax.width * targetResolution);
      const elHeight = Math.floor(fractionOfMax.height * targetResolution);
      ctx.canvas.width = elWidth;
      ctx.canvas.height = elHeight;
      ctx.width = elWidth;
      ctx.height = elHeight;
      ctx.drawImage(el, 0, 0, elWidth, elHeight);
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  function createScopeOutlinePoints() {
    const blackRed = generateSegment({ r: 0, g: 0, b: 0 }, { r: 255, g: 0, b: 0 });
    const blackGreen = generateSegment({ r: 0, g: 0, b: 0 }, { r: 0, g: 255, b: 0 });
    const blackBlue = generateSegment({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });
    const redYellow = generateSegment({ r: 255, g: 0, b: 0 }, { r: 255, g: 255, b: 0 });
    const greenYellow = generateSegment({ r: 0, g: 255, b: 0 }, { r: 255, g: 255, b: 0 });
    const greenCyan = generateSegment({ r: 0, g: 255, b: 0 }, { r: 0, g: 255, b: 255 });
    const blueCyan = generateSegment({ r: 0, g: 0, b: 255 }, { r: 0, g: 255, b: 255 });
    const blueMagenta = generateSegment({ r: 0, g: 0, b: 255 }, { r: 255, g: 0, b: 255 });
    const redMagenta = generateSegment({ r: 255, g: 0, b: 0 }, { r: 255, g: 0, b: 255 });
    const cyanWhite = generateSegment({ r: 0, g: 255, b: 255 }, { r: 255, g: 255, b: 255 });
    const magentaWhite = generateSegment({ r: 255, g: 0, b: 255 }, { r: 255, g: 255, b: 255 });
    const yellowWhite = generateSegment({ r: 255, g: 255, b: 0 }, { r: 255, g: 255, b: 255 });
    const createPoints = (segment) => segment.flatMap((sample) => {
      const { r, g, b } = sample;
      return [r, g, b, 255];
    });
    const segments = [
      blackRed,
      blackGreen,
      blackBlue,
      redYellow,
      greenYellow,
      greenCyan,
      blueCyan,
      blueMagenta,
      redMagenta,
      cyanWhite,
      magentaWhite,
      yellowWhite
    ];
    return segments.flatMap(createPoints);
  }
  function generateSegment(startRGB, endRGB, count = 512) {
    const segment = [];
    for (let i = 0; i < count; i++) {
      const mix = i / count;
      const rgb = lerp3(startRGB, endRGB, mix);
      segment.push(rgb);
    }
    return segment;
  }
  function generateViewTransform(x, y, scopeCenter2, worldScale2, perspectiveStrength2) {
    const cameraTransform = [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      -0.1,
      perspectiveStrength2,
      0,
      0,
      0,
      1
    ];
    const worldTranslateTransform = [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      -scopeCenter2.x,
      -scopeCenter2.y,
      -scopeCenter2.z,
      1
    ];
    const worldScaleTransform = [
      worldScale2.x,
      0,
      0,
      0,
      0,
      worldScale2.y,
      0,
      0,
      0,
      0,
      worldScale2.z,
      0,
      0,
      0,
      0,
      1
    ];
    const worldRotateTransform = mat4Multiply(createRotateXYTransform(-x * 2 * Math.PI), createRotateYZTransform(y * 2 * Math.PI / 2));
    const worldTransform = mat4Multiply(mat4Multiply(worldTranslateTransform, worldScaleTransform), worldRotateTransform);
    return mat4Multiply(worldTransform, cameraTransform);
  }

  // src/env.js
  var env = {
    extension: "firefox"
  };
  console.log(env);

  // src/webgl.js
  var getExtensionUrl = (path) => {
    if (env.extension === "chrome") {
      return chrome.runtime.getURL(path);
    } else if (env.extension === "firefox") {
      return browser.runtime.getURL(path);
    } else
      return path;
  };
  var boundaryPoints = createScopeOutlinePoints();
  var GLScopeViewer = class {
    constructor(gl, useP32 = false) {
      this.useP3 = useP32;
      this.gl = gl;
      this.gl.enable(this.gl.BLEND);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.depthFunc(this.gl.LESS);
      this.pointsLength = 0;
    }
    async init() {
      await this.#initShader();
    }
    async #initShader() {
      const vertexShaderSource = await fetchText("points.vert");
      const fragmentShaderSource = await fetchText("points.frag");
      this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
      this.gl.useProgram(this.program);
      const resolutionUniformLocation = this.gl.getUniformLocation(this.program, "u_resolution");
      this.gl.uniform2f(resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);
      const useP3UniformLocation = this.gl.getUniformLocation(this.program, "u_use_p3");
      console.log("useP3", this.useP3);
      this.gl.uniform1i(useP3UniformLocation, this.useP3 ? 1 : 0);
    }
    setBufferData(data) {
      if (!this.program) {
        return;
      }
      if (!this.pointsLength) {
        this.#initPoints();
      }
      let combinedArray = new Float32Array(data.length + boundaryPoints.length);
      combinedArray.set(data, 0);
      combinedArray.set(boundaryPoints, data.length);
      this.pointsLength = combinedArray.length / 4;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, combinedArray, this.gl.STATIC_DRAW);
    }
    #initPoints() {
      const vao = this.gl.createVertexArray();
      this.gl.bindVertexArray(vao);
      const colorAttributeLocation = this.gl.getAttribLocation(this.program, "a_color");
      this.colorBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.enableVertexAttribArray(colorAttributeLocation);
      this.gl.vertexAttribPointer(colorAttributeLocation, 4, this.gl.FLOAT, false, 0, 0);
      this.gl.bindVertexArray(vao);
    }
    renderScope(viewTransform) {
      if (!this.program || !this.pointsLength) {
        return;
      }
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.clearDepth(1);
      this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
      const viewTransformUniformLocation = this.gl.getUniformLocation(this.program, "u_view_transform");
      this.gl.uniformMatrix4fv(viewTransformUniformLocation, false, viewTransform);
      const primitiveType = this.gl.POINTS;
      const elementOffset = 0;
      const count = this.pointsLength;
      this.gl.drawArrays(primitiveType, elementOffset, count);
    }
  };
  function fetchText(path) {
    return fetch(getExtensionUrl(path)).then((response) => response.text());
  }
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
  function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  // src/main.js
  var scopeSize = 512;
  var samplingResolution = 512;
  var elementIndex = 0;
  var srcEl = null;
  makeActiveElement(document.querySelectorAll("img, video")[elementIndex]);
  if (!srcEl) {
    console.log("no source element, exiting");
    throw new Error("Exit");
  }
  var startPointUpdateLoop = () => {
  };
  var stopPointUpdateLoop = () => {
  };
  var rotation = {
    x: 0.5,
    y: 1
  };
  var mouse = {
    x: 0,
    y: 0
  };
  var draggerState = {
    downMousePos: {
      x: 0,
      y: 0
    },
    downElPos: {
      x: 0,
      y: 0
    }
  };
  var worldScale = { x: 3, y: 3, z: 1 };
  var scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 };
  var perspectiveStrength = 0;
  var containerEl = html`<div style="
    position: fixed;
    top: 0;
    left: 0;
    width: ${scopeSize}px;
    height: ${scopeSize}px;
    z-index: 1000000;
    background-color: #00000022;
"></div>`;
  var imagePreviewEl = html`<canvas></canvas>`;
  imagePreviewEl.originClean = false;
  var resultEl = html`<canvas style="width: 100%; height: 100%;"></canvas>`;
  containerEl.appendChild(resultEl);
  var draggerEl = html`<div style="
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  background-color: #ff0000;
"></div>`;
  containerEl.appendChild(draggerEl);
  draggerEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    draggerState.downMousePos = { x: clientX, y: clientY };
    draggerState.downElPos = { x: containerEl.offsetLeft, y: containerEl.offsetTop };
    const onMouseMove = (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      const { clientX: clientX2, clientY: clientY2 } = e2;
      const { downMousePos, downElPos } = draggerState;
      const deltaX = clientX2 - downMousePos.x;
      const deltaY = clientY2 - downMousePos.y;
      containerEl.style.left = `${downElPos.x + deltaX}px`;
      containerEl.style.top = `${downElPos.y + deltaY}px`;
    };
    const onMouseUp = (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      document.removeEventListener("mousemove", onMouseMove);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp, { once: true });
  });
  document.body.appendChild(containerEl);
  var dpr = window.devicePixelRatio;
  resultEl.width = scopeSize * dpr;
  resultEl.height = scopeSize * dpr;
  var imagePreviewCtx = imagePreviewEl.getContext("2d", { colorSpace: "display-p3" });
  var imageData = imagePreviewCtx.getImageData(0, 0, 1, 1);
  var useP3 = imageData.colorSpace === "display-p3";
  var resultCtx = resultEl.getContext("webgl2");
  if (!resultCtx) {
    alert("Your browser does not support WebGL2");
  }
  init(imagePreviewCtx, resultCtx);
  async function init(sourceCtx, scopeCtx) {
    const viewer = new GLScopeViewer(scopeCtx, useP3);
    await viewer.init();
    const updatePoints = () => {
      const previewImageData = getImageDataFromSrcEl(srcEl, sourceCtx, samplingResolution);
      viewer.setBufferData(previewImageData.data);
    };
    let intervalRef = null;
    startPointUpdateLoop = () => {
      if (!intervalRef) {
        intervalRef = setInterval(updatePoints, 1e3 / 25);
        updatePoints();
      }
    };
    stopPointUpdateLoop = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      updatePoints();
    };
    const render = () => {
      requestAnimationFrame(render);
      const viewTransform = generateViewTransform(rotation.x, rotation.y, scopeCenter, worldScale, perspectiveStrength);
      viewer.renderScope(viewTransform);
    };
    render();
    startPointUpdateLoop();
    const onMouseDown = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const onMouseMove = (e2) => {
        const relativeX = e2.clientX - mouse.x;
        const relativeY = e2.clientY - mouse.y;
        rotation.x += 1e-3 * relativeX;
        rotation.y += 1e-3 * relativeY;
        rotation.x = wrap(rotation.x, 0, 1);
        rotation.y = clamp(rotation.y, 0, 1);
        mouse.x = e2.clientX;
        mouse.y = e2.clientY;
      };
      window.addEventListener("mousemove", onMouseMove);
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
      };
      window.addEventListener("mouseup", onMouseUp, { once: true });
    };
    resultEl.addEventListener("mousedown", onMouseDown);
    resultEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const scale = -e.deltaY / 1e3;
      worldScale.x *= 1 + scale;
      worldScale.y *= 1 + scale;
      worldScale.z *= 1 + scale;
      return false;
    });
    const perspectiveIncrement = 0.25;
    document.addEventListener("keydown", (e) => {
      if (e.key === "z") {
        perspectiveStrength += perspectiveIncrement;
      } else if (e.key === "x") {
        perspectiveStrength -= perspectiveIncrement;
      } else if (e.key === "v") {
        elementIndex += 1;
        makeActiveElement(document.querySelectorAll("img, video")[elementIndex]);
      } else if (e.key === "c") {
        elementIndex = Math.max(0, elementIndex - 1);
        makeActiveElement(document.querySelectorAll("img, video")[elementIndex]);
      }
    });
  }
  function makeActiveElement(el) {
    srcEl && (srcEl.style.outline = "none");
    el.crossOrigin = "anonymous";
    el.style.outline = "2px solid red";
    srcEl = el;
  }
  function html(strings, ...keys) {
    const htmlString = strings.map((str, index) => `${str}${keys[index] || ""}`.trim()).join("").trim();
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    return doc.children[0].children[1].children[0];
  }
})();
