import {
  createScopeOutlinePoints,
} from './scope.js';

const boundaryPoints = createScopeOutlinePoints();
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

  async init() {
    await this.#initShader();
  }

  async #initShader() {
    const vertexShaderSource = await fetchText('./points.vert');
    const fragmentShaderSource = await fetchText('./points.frag');

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = createProgram(this.gl, vertexShader, fragmentShader);
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
    if (!this.program || !this.pointsLength) {
      return;
    }
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

    // resizeCanvasToDisplaySize(this.gl.canvas) // use per frame so the this.gl size matches canvas element size
    this.gl.drawArrays(primitiveType, elementOffset, count);
  }
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
