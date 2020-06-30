import { mat4, vec2, vec3, quat, vec4, ReadonlyMat4 } from 'gl-matrix';

//NOTE: vertex shader program
const vsSource = `
  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uWorldView;
  uniform mat4 uProjection;
  uniform vec4 uColor;

  varying vec2 vTextureCoord;
  varying vec4 vColor;
  varying float vFogDepth;

  void main(void) {
    gl_Position = uProjection * uWorldView * vec4(aVertexPosition, 1);
    vTextureCoord = aTextureCoord;
    vColor = uColor;
    vFogDepth = -(uWorldView * vec4(aVertexPosition, 1)).z;
  }
`;

//NOTE: fragment shader program
const fsSource = `
  precision mediump float;
  varying vec2 vTextureCoord;
  varying vec4 vColor;
  varying float vFogDepth;

  uniform int uUseTexture;
  uniform sampler2D uSampler;
  uniform vec4 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  void main(void) {
    vec4 color = uUseTexture == 1 ? texture2D(uSampler, vTextureCoord) : vColor;
    
    if(color.a < 0.1)
      discard;

    float fogAmount = smoothstep(uFogNear, uFogFar, vFogDepth);
    gl_FragColor = mix(color, uFogColor, fogAmount);
  }
`;

// class TinEffect { 
  
//   private engine: TinGin;
  
//   constructor(engine: TinGin) {
//     this.engine = engine;
//   }

//   //public loadShader(vertexShader: string, pixelShader: string, attribs: any, uniforms: any): 


//   public use(): void {
//     const { gl } = this.engine;
//     //gl.useProgram();
//   }
// }

class TinCamera {
  private engine: TinGin;
  private speed: number   = 30.0;
  private fov: number     = 60.0 * Math.PI / 180.0;
  private near: number    = 0.01;
  private far: number     = 1000.0;
  private cameraMat: mat4 = mat4.create();
  private viewMat: mat4   = mat4.create();
  private projMat: mat4   = mat4.create();
  private viewProjMat: mat4 = mat4.create();
  private angles: vec2    = vec2.create();
  private position: vec3  = vec3.create();
  private forward: vec3   = vec3.create();
  private right: vec3     = vec3.create();

  constructor(engine: TinGin) {
    this.engine = engine;
    this.createPerspective(this.fov, this.near, this.far);
  }

  public getView(): mat4 { return this.viewMat; }
  public getProj(): mat4 { return this.projMat; }
  public getViewProj(): mat4 { return this.viewProjMat; }

  public createPerspective(fov: number, near: number, far: number) {
    const { gl } = this.engine;
    this.fov  = fov;
    this.near = near;
    this.far  = far;

    const aspect: number = gl.canvas.width / gl.canvas.height;
    this.projMat = mat4.perspective(mat4.create(), fov, aspect, near, far);
  }

  public render(deltaTime: number) {
    const { gl } = this.engine;

    this.processControlls(deltaTime);
	  this.viewMat = mat4.invert(mat4.create(), this.cameraMat)
    this.viewProjMat = mat4.multiply(mat4.create(), this.projMat, this.viewMat);
  
    //NOTE: set all camera uniforms
    const programInfo = this.engine.getProgram();
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uProjection, false, this.getProj());
    gl.uniform4fv(programInfo.uniformLocations.uFogColor, this.engine.getClearColor());
    gl.uniform1f(programInfo.uniformLocations.uForNear, 1.0);
    gl.uniform1f(programInfo.uniformLocations.uFogFar, 50.0);
  }

  public mouseMove(deltaMoveX: number, deltaMoveY: number) {
    const adjustedDeltaTime: number = this.engine.getDeltaTime() * 0.15;
    this.angles = vec2.add(vec2.create(), this.angles, vec2.fromValues(deltaMoveX * adjustedDeltaTime, deltaMoveY * adjustedDeltaTime));
  }

  private processControlls(deltaTime: number) {

    const { engine } = this;
    const scalarSpeed: number = this.speed * deltaTime;
    const keys = engine.getInput().getKeysState();

    if (keys['w']) {
      const speed = vec3.fromValues(scalarSpeed, scalarSpeed, scalarSpeed);
      this.position = vec3.add(vec3.create(), this.position, vec3.multiply(vec3.create(), this.forward, speed));
    }

    if (keys['a']) {
      const speed = vec3.fromValues(-scalarSpeed, -scalarSpeed, -scalarSpeed);
      this.position = vec3.add(vec3.create(), this.position, vec3.multiply(vec3.create(), this.right, speed));
    }

    if (keys['s']) {
      const speed = vec3.fromValues(-scalarSpeed, -scalarSpeed, -scalarSpeed);
      this.position = vec3.add(vec3.create(), this.position, vec3.multiply(vec3.create(), this.forward, speed));
    }

    if (keys['d']) {
      const speed = vec3.fromValues(scalarSpeed, scalarSpeed, scalarSpeed);
      this.position = vec3.add(vec3.create(), this.position, vec3.multiply(vec3.create(), this.right, speed));
    }

    const rotY = mat4.fromYRotation(mat4.create(), -this.angles[0]);
    const rotX = mat4.fromXRotation(mat4.create(), -this.angles[1]);
    const translation = mat4.translate(mat4.create(), mat4.create(), vec3.multiply(vec3.create(), this.position, vec3.fromValues(-1.0, -1.0, -1.0)));

    this.cameraMat = mat4.multiply(mat4.create(), translation, mat4.multiply(mat4.create(), rotY, rotX));
    this.forward = vec3.fromValues(this.cameraMat[8], this.cameraMat[9], this.cameraMat[10]);
    this.right = vec3.cross(vec3.create(), this.forward, vec3.fromValues(0.0, 1.0, 0.0));
  }
}

class TinScene {
  private objects: Array<any> = [];
  private engine: TinGin;

  constructor(engine: TinGin) {
    this.engine = engine;
  }

  public createObject = (objType: string) => {
    let newObject: any = null;
    
    switch (objType) {
      case 'camera': {
        newObject = new TinCamera(this.engine);
      } break;

      case 'mesh': {
        newObject = new TinMesh(this.engine);
      } break;

      case 'grid': {
        newObject = new TinGrid(this.engine);
      } break;

      case 'plane': {
        newObject = new TinPlane(this.engine);
      } break;
    }

    this.objects.push(newObject);
    return newObject;
  }

  public removeObject = (obj: Object) => {
    const objIndex: number = this.objects.indexOf(obj);

    if (objIndex > -1)
      this.objects.splice(objIndex, 1);
  }

  public render = (deltaTime: number) => {
    for (const obj of this.objects) {
      if (obj.render !== undefined)
        obj.render(deltaTime);
    }
  }
}

class TinInput {
  private keys: any = {};
  private engine: TinGin;

  constructor(engine: TinGin) {
    this.engine = engine;
    this.bindEvents();
  }

  public getKeysState(): any { return this.keys; }

  public isDown(key: string): boolean {
    return this.keys[key] !== undefined;
  }

  private bindEvents(): void {
    document.onkeydown = this.onKeyDown.bind(this, true);
    document.onkeyup   = this.onKeyDown.bind(this, false);
    this.initPointerLock();
  }

  private initPointerLock(): void {
    const { engine } = this;
    const canvas = engine.getCanvas();

    if (canvas) {
      canvas.onclick = () => {
        canvas.requestPointerLock();
      }

      canvas.requestPointerLock();
    }

    document.onmousemove = (e) => {
      if (document.pointerLockElement === canvas) {
        engine.getCamera().mouseMove(e.movementX, e.movementY)
      }
    }
  }

  private onKeyDown = (down: boolean, e: any) => {
    this.keys[e.key] = down;
  }
}

export class Transform {
  private position: vec3 = vec3.create();
  private rotation: mat4 = mat4.create();
  private scale: vec3 = vec3.fromValues(1.0, 1.0, 1.0);
  private matrix: mat4 = mat4.identity(mat4.create());
  private wasChanged: boolean = false;

  public setPos(pos: vec3): void { 
    this.position = pos; 
    this.wasChanged = true;
  }

  public getPos(): vec3 { return this.position; }

  public setRot(rot: mat4): void { 
    this.rotation = rot; 
    this.wasChanged = true;
  }

  public getRot(): mat4 { return this.rotation; }

  public setScale(scale: vec3): void { 
    this.scale = scale; 
    this.wasChanged = true;
  } 

  public getScale(): vec3 { return this.scale; }

  public getMatrix(): mat4 { 
    if(this.wasChanged) {
      const translation: mat4 = mat4.translate(mat4.create(), mat4.identity(mat4.create()), this.position);
      const scale: mat4 = mat4.scale(mat4.create(), mat4.identity(mat4.create()), this.scale);
      this.matrix = mat4.multiply(mat4.create(), mat4.multiply(mat4.create(), translation, this.rotation), scale);   
      this.wasChanged = false;
    }

    return this.matrix;
  }
}

export class TinTexture { 
  private engine: TinGin;
  private glTexture: WebGLTexture;
  private img: HTMLImageElement;
  private width: number = 50;
  private height: number = 50;

  constructor(engine: TinGin) {
    this.engine = engine;
  }

  public loadTexture(url: string): void {
    const { gl } = this.engine;
    this.glTexture = gl.createTexture();

    this.img = new Image();
    this.img.src = url;
    this.img.onload = this.imageLoaded.bind(this);
  
    this.bind();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
  }

  private isPowerOf2(value): boolean {
    return (value & (value - 1)) == 0;
  }

  private imageLoaded(): void {
    const { gl } = this.engine;
    this.bind();
    this.width  = this.img.width;
    this.height = this.img.height;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);

    if (this.isPowerOf2(this.width) && this.isPowerOf2(this.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  public bind(): void {
    const { gl } = this.engine;
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);  
  }

  public activate(): void {
    const { gl } = this.engine;
    const programInfo = this.engine.getProgram();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  }
}

export class TinPlane extends Transform {
  private engine: TinGin;
  private texture: TinTexture;
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private uvBuffer: WebGLBuffer;

  private indices: Array<number> = [];
  private vertices: Array<number> = [];
  private uv: Array<number> = [];
  private color: vec4 = vec4.fromValues(1.0, 0.0, 1.0, 1.0);

  constructor(engine: TinGin) {
    super();
    this.engine = engine;
    this.createBuffers();
  }

  public setTexture(texture: TinTexture): void { this.texture = texture; }
  public getTexture(): TinTexture { return this.texture; }

  public setColor(color: vec4): void { this.color = color; }
  public getColor(): vec4 { return this.color; }

  private createBuffers(): void {
    const gl = this.engine.gl;

    //NOTE: vertex
    this.vertices = [
      -1, 0, -1,
      -1, 0,  1,
       1, 0,  1,
       1, 0, -1
    ];

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

    //NOTE: uvs
    this.uv = [
      0, 0,
      0, 1,
      1, 1,
      1, 0
    ];

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uv), gl.STATIC_DRAW);

    //NOTE: indices
    this.indices = [
      0, 2, 1, 
      0, 3, 2
    ];

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
  }

  public render(deltaTime: number): void {

    const gl = this.engine.gl;
    const programInfo = this.engine.getProgram();
    const cam: TinCamera = this.engine.getCamera();

    //NOTE: bind vertex buffer
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }
  
    //NOTE: bind uv buffer
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.useProgram(programInfo.program);

    gl.uniform1i(programInfo.uniformLocations.uUseTexture, this.texture !== undefined ? 1 : 0);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.uWorldView, false, mat4.mul(mat4.create(), cam.getView(), this.getMatrix()));
    gl.uniform4fv(programInfo.uniformLocations.uColor, new Float32Array(this.color));
    //NOTE: if we have textured quad lets active the texture before rendering
    if(this.texture !== undefined) {
      this.texture.activate();
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
} 

export class TinGrid extends Transform {
  private engine: TinGin;
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private indices: Array<number> = [];
  private vertices: Array<number> = [];
  private color: vec4 = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

  constructor(engine: TinGin) {
    super();
    this.engine = engine;
    this.createBuffers();
  }

  public setColor(color: vec4): void { this.color = color; }

  private createBuffers(): void {
    const gl = this.engine.gl;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    //NOTE: generate grid vertices
    const slices = 50.0;
    
    for(let i: number = 0; i <= slices; ++i) {
      this.vertices.push(i, 0.0, 0.0);
      this.vertices.push(i, 0.0, slices);
      this.vertices.push(0.0, 0.0, i);
      this.vertices.push(slices, 0.0, i);
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    for(let i: number = 0; i <= this.vertices.length; ++i)
      this.indices.push(i);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
  }

  public render(deltaTime: number): void {

    const gl = this.engine.gl;
    const programInfo = this.engine.getProgram();
    const cam: TinCamera = this.engine.getCamera();

    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexPosition,
          3,
          gl.FLOAT,
          false,
          0,
          0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.useProgram(programInfo.program);
    gl.uniform1i(programInfo.uniformLocations.uUseTexture, 0);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uWorldView, false, mat4.mul(mat4.create(), cam.getView(), this.getMatrix()));
    gl.uniform4fv(programInfo.uniformLocations.uColor, new Float32Array(this.color));
    gl.drawElements(gl.LINES, this.vertices.length / 2, gl.UNSIGNED_SHORT, 0);
  }
}

export class TinMesh extends Transform {
  private engine:TinGin;
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;

  constructor(engine: TinGin) {
    super();
    this.engine = engine;
    this.createBuffers();
  }

  private createBuffers(): void {
    const gl = this.engine.gl;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const positions = [
      // Front face
      -1.0, -1.0,  1.0,
      1.0, -1.0,  1.0,
      1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
      1.0,  1.0, -1.0,
      1.0, -1.0, -1.0,
      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
      1.0,  1.0,  1.0,
      1.0,  1.0, -1.0,
      // Bottom face
      -1.0, -1.0, -1.0,
      1.0, -1.0, -1.0,
      1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,
      // Right face
      1.0, -1.0, -1.0,
      1.0,  1.0, -1.0,
      1.0,  1.0,  1.0,
      1.0, -1.0,  1.0,
      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    const indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ];

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }

  public render(deltaTime: number): void {

    const gl = this.engine.gl;
    const programInfo = this.engine.getProgram();
    const cam: TinCamera = this.engine.getCamera();

    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.vertexPosition);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uWorldView, false, mat4.mul(mat4.create(), cam.getView(), this.getMatrix()));
    
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }
}

export class TinGin {

  public gl?: WebGLRenderingContext;
  public canvas: HTMLCanvasElement;
  private defaultProgramInfo: Object;
  private lastTime?: Date;
  private deltaTime: number;
  private scene: TinScene;
  private input: TinInput;
  private camera: TinCamera;
  private clearColor: vec4 = vec4.fromValues(0.07, 0.07, 0.27, 255);

  constructor() {
    this.init(800, 600);
    this.scene = new TinScene(this);
    this.input = new TinInput(this);
    this.camera = new TinCamera(this);
  }

  public setClearColor(color: vec4): void { this.clearColor = color; }
  public getClearColor(): vec4 { return this.clearColor; }

  public getCamera(): TinCamera { return this.camera; }
  public getInput(): TinInput { return this.input; }
  public getScene(): TinScene { return this.scene; }
  public getDeltaTime(): number { return this.deltaTime; }
  public getCanvas(): HTMLCanvasElement | undefined { return this.canvas; }
  public getProgram(): any { return this.defaultProgramInfo; }

  public createAndLoadTexture(url: string): TinTexture {
    const texture: TinTexture = new TinTexture(this);
    texture.loadTexture(url);
    return texture;
  }

  private init(width: number, height: number): void {
    //NOTE: create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    this.canvas = canvas;
    this.lastTime = new Date();
    this.gl = canvas.getContext('webgl');

    this.initWebGL();
    this.initDefaultShader();
  }

  private initWebGL = () => {
    const { gl } = this;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  
  private initDefaultShader(): void {
    const { gl } = this;
    console.log(`[*] loading default shader`);
    const defaultProgram = this.createShader(vsSource, fsSource);
    
    this.defaultProgramInfo = {
      program: defaultProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(defaultProgram, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(defaultProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        
        modelViewProjMatrix:    gl.getUniformLocation(defaultProgram, 'uMVPMatrix'),
        uWorldView:             gl.getUniformLocation(defaultProgram, 'uWorldView'), 
        uProjection:            gl.getUniformLocation(defaultProgram, 'uProjection'),

        uSampler:               gl.getUniformLocation(defaultProgram, 'uSampler'),
        uUseTexture:            gl.getUniformLocation(defaultProgram, 'uUseTexture'),
        uColor:                 gl.getUniformLocation(defaultProgram, 'uColor'),

        //-- FOG
        uFogColor:              gl.getUniformLocation(defaultProgram, "uFogColor"),
        uFogNear:               gl.getUniformLocation(defaultProgram, "uFogNear"),
        uFogFar:                gl.getUniformLocation(defaultProgram, "uFogFar")
      },
    };
  }

  private loadShader(type: number, source: string): WebGLShader {
    const { gl } = this;
    const shader: WebGLShader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
  
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
  
    return shader;
  }

  private createShader(vsSource: string, fsSource: string): WebGLProgram {

    const { gl } = this;
    const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource);

    //NOTE: create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    //NOTE: if creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }
    return shaderProgram;
  }

  public run = (onTick: Function = undefined) => {
    const { gl, scene, camera } = this;
    this.deltaTime = (new Date().valueOf() - this.lastTime.valueOf()) / 1000.0;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);

    camera.render(this.deltaTime);
    scene.render(this.deltaTime);

    if(onTick !== undefined)  {
      onTick(this.deltaTime);
    }

    this.lastTime = new Date();
    requestAnimationFrame(this.run.bind(this, onTick));
  }
}
