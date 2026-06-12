/**
 * lumaweb/hero-canvas.js
 * Renders the animated WebGL2 background in the hero section.
 */

(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const hero = canvas.parentElement;
  const gl   = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
  });
  if (!gl) return;

  /* ── Shaders ── */
  const VS_SRC = `#version 300 es
in vec4 p;
void main(){ gl_Position = p; }`;

  const FS_SRC = `#version 300 es
precision highp float;
uniform float T, PX, SW, SI, PR, SF, SS, SC, RO;
uniform vec2  RS;
uniform vec4  C1, C2, C3;
out vec4 o;

#define PI  3.14159265
#define TAU 6.28318530

vec2 rot(vec2 u, float a){
  return mat2(cos(a), sin(a), -sin(a), cos(a)) * u;
}
float rnd(vec2 s){
  return fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
}
float nz(vec2 s){
  vec2 i = floor(s), f = fract(s), u = f*f*(3.-2.*f);
  return mix(
    mix(rnd(i),           rnd(i+vec2(1,0)), u.x),
    mix(rnd(i+vec2(0,1)), rnd(i+vec2(1,1)), u.x), u.y);
}
vec4 bl(vec4 a, vec4 b, vec4 c, float m, float e, float eb){
  float r1 = smoothstep(.35*e, .7-.35*e+.5*eb, m);
  float r2 = smoothstep(.3+.35*e, 1.-.35*e+eb, m);
  return vec4(
    mix(mix(a.rgb*a.a, b.rgb*b.a, r1), c.rgb*c.a, r2),
    mix(mix(a.a, b.a, r1), c.a, r2));
}
void main(){
  vec2 uv = gl_FragCoord.xy / RS;
  float ns = .0005 + .006*SC, t = .5*T;
  uv -= .5; uv *= ns*RS; uv = rot(uv, RO*.5*PI); uv /= PX; uv += .5;
  float n1 = nz(uv + t), n2 = nz(uv*2. - t), an = n1*TAU;
  float itr = ceil(clamp(SI, 1., 30.));
  for(float i = 1.; i <= itr; i++){
    uv.x += clamp(SW,0.,2.)/i * cos(t + i*1.5*uv.y);
    uv.y += clamp(SW,0.,2.)/i * cos(t + i*uv.x);
  }
  vec2 uv2 = uv * (.5 + 3.5*SS);
  float sh = .5 + .5*sin(uv2.x)*cos(uv2.y);
  float p  = clamp(PR, 0., 1.);
  float m  = sh + .48*sign(p-.5)*pow(abs(p-.5), .5);
  o = bl(C1, C2, C3, m, 1.-clamp(SF,0.,1.), .01+.01*SC);
}`;

  /* ── Compile & link ── */
  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER,   VS_SRC));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FS_SRC));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* ── Geometry ── */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
    gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  /* ── Uniform locations ── */
  const U = {};
  ['T','RS','PX','SC','RO','PR','SF','SS','SW','SI','C1','C2','C3']
    .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  /* ── Resize ── */
  function resize() {
    const w   = hero.clientWidth  || window.innerWidth;
    const h   = hero.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  setTimeout(resize, 100);
  window.addEventListener('resize', resize, { passive: true });

  /* ── Render loop ── */
  const t0 = performance.now();
  function draw(now) {
    const t   = ((now - t0) / 1000) * 0.55 - 2.5;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    gl.uniform1f(U.T,  t);
    gl.uniform2f(U.RS, canvas.width, canvas.height);
    gl.uniform1f(U.PX, dpr);
    gl.uniform1f(U.SC, 0.01);
    gl.uniform1f(U.RO, -50 * Math.PI / 180);
    gl.uniform1f(U.PR, 0.01);
    gl.uniform1f(U.SF, 0.47);
    gl.uniform1f(U.SS, 0.45);
    gl.uniform1f(U.SW, 0.5);
    gl.uniform1f(U.SI, 16.0);
    gl.uniform4f(U.C1, 0.024, 0.024, 0.059, 1);
    gl.uniform4f(U.C2, 0.29,  0.50,  1.0,   1);
    gl.uniform4f(U.C3, 0.035, 0.035, 0.09,  1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
