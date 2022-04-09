// const scopeSize = 1024;
// const samplingResolution = 256;

// const worldScale = { x: 0.03, y: 0.03, z: 0.08 };
// const scopeCenter = { x: 0, y: 0, z: 3 };

// let t = 0;
// const perspectiveStrength = 0;


// const resultEl = document.getElementById('result');
// resultEl.width = scopeSize;
// resultEl.height = scopeSize;

// const gl = resultEl.getContext('webgl2');
// if (!gl) {
//   alert('Your browser does not support WebGL2');
// }


// const points = [
//   { x: 0, y: 0, z: 0, r: 1, g: 0, b: 0, a: 1 },
//   { x: 0, y: 0.5, z: 1, r: 0, g: 1, b: 0, a: 1 },
//   { x: 0.7, y: 0, z: 1, r: 0, g: 0, b: 1, a: 1 },
//   { x: 0.6, y: 0, z: 1, r: 0, g: 0, b: 1, a: 0.5 },
//   { x: 0.5, y: 0, z: 1, r: 0, g: 0, b: 1, a: 0.25 },
//   { x: 0.4, y: 0, z: 1, r: 0, g: 0, b: 1, a: 0.125 },
// ];

// glDrawPoints(gl, points);

export class GLScopeViewer {
  constructor(
    gl,
  ) {
    this.gl = gl;
    this.gl.enable(this.gl.BLEND);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.depthFunc(this.gl.LESS);

    this.pointsLength = 0;
  }

  async setPoints(points) {
    this.pointsLength = points.length;

    const vertexShaderSource = await fetchText('./points.vert');
    const fragmentShaderSource = await fetchText('./points.frag');

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = createProgram(this.gl, vertexShader, fragmentShader);

    const positionAttributeLocation = this.gl.getAttribLocation(this.program, "a_position");
    const positionBuffer = this.gl.createBuffer();

    const positions = mapPointsToPositions(points);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);


    const vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(vao);
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    this.gl.vertexAttribPointer(
      positionAttributeLocation,
      3, // size:  n components per iteration
      this.gl.FLOAT, // type: the data is 32bit floats
      false, // normalize: don't normalize the data
      0, // stride: 0 = move forward size * sizeof(type) each iteration to get the next position
      0, // offset: start at the beginning of the buffer
    );

    const colorAttributeLocation = this.gl.getAttribLocation(this.program, "a_color");
    const colorBuffer = this.gl.createBuffer();
    const colors = mapPointsToColors(points);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
    this.gl.enableVertexAttribArray(colorAttributeLocation);
    this.gl.vertexAttribPointer(
      colorAttributeLocation,
      4, // size:  n components per iteration
      this.gl.FLOAT, // type: the data is 32bit floats
      false, // normalize: don't normalize the data
      0, // stride: 0 = move forward size * sizeof(type) each iteration to get the next position
      0, // offset: start at the beginning of the buffer
    );

    this.gl.useProgram(this.program);
    this.gl.bindVertexArray(vao);
  }

  renderScope(viewTransform) {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.clearDepth(1);
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

    const resolutionUniformLocation = this.gl.getUniformLocation(this.program, "u_resolution");
    this.gl.uniform2f(resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);
    // 4x4 matrix
    const viewTransformUniformLocation = this.gl.getUniformLocation(this.program, "u_view_transform");
    this.gl.uniformMatrix4fv(viewTransformUniformLocation, false, viewTransform);


    const primitiveType = this.gl.POINTS;
    const elementOffset = 0;
    const count = this.pointsLength;

    resizeCanvasToDisplaySize(this.gl.canvas) // use per frame so the this.gl size matches canvas element size
    this.gl.drawArrays(primitiveType, elementOffset, count);
  }
}

function mapPointsToPositions(points) {
  return points.flatMap(point => [point.x, point.y, point.z]);
}

function mapPointsToColors(points) {
  return points.flatMap(point => [point.r / 255, point.g / 255, point.b / 255, point.a / 255]);
}


function fetchText(path) {
  return fetch(path)
    .then(response => response.text());
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

function createProgram(gl, vertexShader, fragmentShader) {
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

function resizeCanvasToDisplaySize(canvas) {
  const dpr = window.devicePixelRatio;
  const displayWidth = canvas.clientWidth * dpr;
  const displayHeight = canvas.clientHeight * dpr;

  // Check if the canvas is not the same size.
  const needResize = canvas.width !== displayWidth ||
    canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}