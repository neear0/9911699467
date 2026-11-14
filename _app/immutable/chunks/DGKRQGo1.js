function e(){let e=[[[0,1,0],[[0,1,0],[1,1,0],[1,1,1],[0,1,1]]],[[0,-1,0],[[0,0,0],[0,0,1],[1,0,1],[1,0,0]]],[[1,0,0],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]]],[[-1,0,0],[[0,0,0],[0,1,0],[0,1,1],[0,0,1]]],[[0,0,1],[[0,0,1],[0,1,1],[1,1,1],[1,0,1]]],[[0,0,-1],[[0,0,0],[1,0,0],[1,1,0],[0,1,0]]]],t=[];for(let[n,r]of e)for(let e of[0,1,2,0,2,3])t.push(...r[e],...n);return new Float32Array(t)}var t=()=>matchMedia(`(prefers-reduced-motion: reduce)`).matches,n=({color:n=[.29,.5,1],pitch:r=16,lift:i=3.3,elevation:a=40,hover:o=!0}={})=>s=>{let c=s.parentElement,l=t(),u=s.getContext(`webgl2`,{alpha:!1,antialias:!0});if(!u)return;let d=(e,t)=>{let n=u.createProgram();for(let[r,i]of[[u.VERTEX_SHADER,e],[u.FRAGMENT_SHADER,t]]){let e=u.createShader(r);u.shaderSource(e,i),u.compileShader(e),u.getShaderParameter(e,u.COMPILE_STATUS)||console.error(`cube_flow shader:`,u.getShaderInfoLog(e)),u.attachShader(n,e)}return u.linkProgram(n),u.getProgramParameter(n,u.LINK_STATUS)?n:null},f=d(`#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }`,`#version 300 es
precision highp float;
uniform float T, PITCH, N, EASE, MAX_STEP;
uniform mat3 R;
uniform sampler2D PREV;   // last frame's values
out vec4 o;

// The old hero's pattern with its exact constants. s is a screen point in css px
// from the centre (y up), so the cubes show the same picture it used to paint.
float flow(vec2 s){
  const float a = -1.3708;   // the old RO * PI / 2
  vec2 uv = mat2(cos(a), sin(a), -sin(a), cos(a)) * (s * .00056) + .5;
  float t = .5 * (T * .55 - 2.5);
  for (float i = 1.; i <= 16.; i++) {
    uv.x += .5 / i * cos(t + i * 1.5 * uv.y);
    uv.y += .5 / i * cos(t + i * uv.x);
  }
  vec2 uv2 = uv * 2.075;
  float m = .5 + .5 * sin(uv2.x) * cos(uv2.y) - .336;
  return smoothstep(.1855, .5195, m) * (1. - smoothstep(.4855, .8246, m));
}

void main(){
  vec2 cell = floor(gl_FragCoord.xy) - (N - 1.) / 2.;
  vec2 floor_xz = cell * PITCH;
  // average the pattern over the cube's whole floor cell (3 x 3 samples, where its foot
  // lands on screen): the pattern has folds finer than a cube, and a single sample made
  // cubes on them pop up and down from one frame to the next
  float sum = 0.;
  for (float i = -1.; i <= 1.; i++)
    for (float j = -1.; j <= 1.; j++) {
      vec2 p = floor_xz + vec2(i, j) * PITCH * .5;
      sum += flow((R * vec3(p.x, 0., p.y)).xy);
    }
  // and ease towards it at a capped speed: where the pattern turns fast, a cube rising
  // several px a frame makes the grid of cubes strobe like a wagon wheel, so it glides instead
  float prev = texelFetch(PREV, ivec2(gl_FragCoord.xy), 0).r;
  o = vec4(prev + clamp((sum / 9. - prev) * EASE, -MAX_STEP, MAX_STEP), 0., 0., 1.);
}`),p=d(`#version 300 es
in vec3 a_pos;     // unit cube, 0..1
in vec3 a_nrm;
in vec2 a_cell;    // instance: grid cell, centred on the origin
uniform sampler2D FLOW;
uniform float T, GROW_T, PITCH, LIFT, DEPTH, N;
uniform vec2 VIEW;
uniform mat3 R;
uniform vec3 C;
uniform vec3 HOVER;     // cursor in css px from the centre of the canvas (y up), and how lit it is (0..1)
out vec3 v_col;

void main(){
  vec2 floor_xz = a_cell * PITCH;
  float b = texelFetch(FLOW, ivec2(round(a_cell + (N - 1.) / 2.)), 0).r;

  // entrance: cubes grow in a diagonal sweep
  float delay = (a_cell.x - a_cell.y + N) / (2. * N) * .9;
  float grow = clamp((GROW_T - delay) / .8, 0., 1.);
  grow = 1. - pow(1. - grow, 3.);

  float h = PITCH * max(.08, .15 + LIFT * b) * grow + .5;
  vec3 local = (a_pos - vec3(.5, 0., .5)) * vec3(PITCH * .84, h, PITCH * .84);
  vec3 nrm = a_nrm;
  vec3 world = vec3(floor_xz.x, 0., floor_xz.y) + local;
  vec3 v = R * world;
  gl_Position = vec4(v.x / (VIEW.x * .5), v.y / (VIEW.y * .5), -v.z / DEPTH, 1.);

  // flat shading per face, light from the upper left
  float lit = .3 + .7 * max(dot(nrm, normalize(vec3(-.55, 1., .3))), 0.);
  vec3 base = mix(vec3(.04, .045, .1), C, clamp(b, 0., 1.));
  vec3 col = base * lit;
  if (nrm.y > .5) col += vec3(.35, .45, .6) * b * b * .55;   // crests catch the light
  // the cursor: measured on screen from the top of the cube, so a tall column lights up
  // where it is seen, not where its foot stands; colour only, the cube does not move
  vec3 top = R * vec3(floor_xz.x, h, floor_xz.y);
  float d = distance(top.xy, HOVER.xy);
  float near = exp(-d * d / 7000.) * HOVER.z;
  // a deeper blue than the crests, and never darker than the cube already is
  col = mix(col, max(col, vec3(.3, .48, .95) * (.5 + .5 * lit)), clamp(near * .8, 0., .8));
  v_col = col * (.35 + .65 * grow);
}`,`#version 300 es
precision mediump float;
in vec3 v_col;
out vec4 o;
void main(){ o = vec4(v_col, 1.); }`);if(!f||!p)return;let m=(e,t)=>Object.fromEntries(t.map(t=>[t,u.getUniformLocation(e,t)])),h=m(f,[`T`,`PITCH`,`N`,`R`,`EASE`,`PREV`,`MAX_STEP`]),g=m(p,[`FLOW`,`T`,`GROW_T`,`PITCH`,`LIFT`,`DEPTH`,`N`,`VIEW`,`R`,`C`,`HOVER`]),_=u.createVertexArray();u.bindVertexArray(_),u.bindBuffer(u.ARRAY_BUFFER,u.createBuffer()),u.bufferData(u.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),u.STATIC_DRAW);let v=u.getAttribLocation(f,`p`);u.enableVertexAttribArray(v),u.vertexAttribPointer(v,2,u.FLOAT,!1,0,0);let y=u.createVertexArray();u.bindVertexArray(y),u.bindBuffer(u.ARRAY_BUFFER,u.createBuffer()),u.bufferData(u.ARRAY_BUFFER,e(),u.STATIC_DRAW);let b=u.getAttribLocation(p,`a_pos`),x=u.getAttribLocation(p,`a_nrm`);u.enableVertexAttribArray(b),u.vertexAttribPointer(b,3,u.FLOAT,!1,24,0),u.enableVertexAttribArray(x),u.vertexAttribPointer(x,3,u.FLOAT,!1,24,12);let S=u.createBuffer(),C=u.getAttribLocation(p,`a_cell`);u.bindBuffer(u.ARRAY_BUFFER,S),u.enableVertexAttribArray(C),u.vertexAttribPointer(C,2,u.FLOAT,!1,0,0),u.vertexAttribDivisor(C,1);let w=[u.createTexture(),u.createTexture()];for(let e of w)u.bindTexture(u.TEXTURE_2D,e),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_MIN_FILTER,u.NEAREST),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_MAG_FILTER,u.NEAREST),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_WRAP_S,u.CLAMP_TO_EDGE),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_WRAP_T,u.CLAMP_TO_EDGE);let T=[u.createFramebuffer(),u.createFramebuffer()],E=!!u.getExtension(`EXT_color_buffer_float`),D=0,O=-1,k=Math.PI/4,A=a*Math.PI/180,[j,M,N,P]=[Math.cos(k),Math.sin(k),Math.cos(A),Math.sin(A)],F=[j,P*M,-N*M,0,N,P,M,-P*j,N*j];u.useProgram(f),u.uniformMatrix3fv(h.R,!1,F),u.uniform1i(h.PREV,0),u.useProgram(p),u.uniformMatrix3fv(g.R,!1,F),u.uniform3f(g.C,n[0],n[1],n[2]),u.uniform1f(g.LIFT,i),u.uniform1i(g.FLOW,0),u.clearColor(.024,.024,.059,1);let I=1,L=1,R=1,z=0,B=r,V=()=>{I=c.clientWidth,L=c.clientHeight;let e=Math.min(devicePixelRatio||1,1.5);s.width=Math.max(1,Math.round(I*e)),s.height=Math.max(1,Math.round(L*e));let t=B=r*Math.min(1.3,Math.max(.8,I/1440)),n=.71*(I/2+L/2/P)+t*4;R=Math.ceil(2*n/t);let i=new Float32Array(R*R*2);for(let e=0,t=0;e<R;e++)for(let n=0;n<R;n++,t+=2)i[t]=e-(R-1)/2,i[t+1]=n-(R-1)/2;z=R*R,u.bindBuffer(u.ARRAY_BUFFER,S),u.bufferData(u.ARRAY_BUFFER,i,u.STATIC_DRAW);for(let e=0;e<2;e++)u.bindTexture(u.TEXTURE_2D,w[e]),E?u.texImage2D(u.TEXTURE_2D,0,u.RGBA16F,R,R,0,u.RGBA,u.HALF_FLOAT,null):u.texImage2D(u.TEXTURE_2D,0,u.RGBA8,R,R,0,u.RGBA,u.UNSIGNED_BYTE,null),u.bindFramebuffer(u.FRAMEBUFFER,T[e]),u.framebufferTexture2D(u.FRAMEBUFFER,u.COLOR_ATTACHMENT0,u.TEXTURE_2D,w[e],0);u.bindFramebuffer(u.FRAMEBUFFER,null),O=-1,u.useProgram(f),u.uniform1f(h.PITCH,t),u.uniform1f(h.N,R),u.useProgram(p),u.uniform1f(g.PITCH,t),u.uniform1f(g.N,R),u.uniform1f(g.DEPTH,R*t*2),u.uniform2f(g.VIEW,I,L),l&&q(performance.now())},H={x:0,y:0,on:!1,glow:0},U=e=>{if(e.pointerType!==`mouse`)return;let t=c.getBoundingClientRect();H.x=e.clientX-t.left-I/2,H.y=L/2-(e.clientY-t.top),H.on=!0},W=()=>H.on=!1,G=performance.now(),K=0,q=e=>{let t=l?6:(e-G)/1e3,n=(e-O)/1e3,r=O<0?1:1-Math.exp(-n*12),a=O<0?1:100*n/(i*B);H.glow+=(+!!H.on-H.glow)*(O<0?1:1-Math.exp(-n*8)),O=e,u.activeTexture(u.TEXTURE0),u.bindTexture(u.TEXTURE_2D,w[D]),D=1-D,u.bindFramebuffer(u.FRAMEBUFFER,T[D]),u.viewport(0,0,R,R),u.disable(u.DEPTH_TEST),u.useProgram(f),u.uniform1f(h.T,t),u.uniform1f(h.EASE,r),u.uniform1f(h.MAX_STEP,a),u.bindVertexArray(_),u.drawArrays(u.TRIANGLES,0,3),u.bindFramebuffer(u.FRAMEBUFFER,null),u.viewport(0,0,s.width,s.height),u.enable(u.DEPTH_TEST),u.useProgram(p),u.uniform1f(g.T,t),u.uniform1f(g.GROW_T,l?10:t),u.uniform3f(g.HOVER,H.x,H.y,H.glow),u.bindTexture(u.TEXTURE_2D,w[D]),u.bindVertexArray(y),u.clear(u.COLOR_BUFFER_BIT|u.DEPTH_BUFFER_BIT),u.drawArraysInstanced(u.TRIANGLES,0,36,z)},J=e=>{q(e),K=requestAnimationFrame(J)},Y=new IntersectionObserver(([e])=>{cancelAnimationFrame(K),e.isIntersecting&&!l&&(K=requestAnimationFrame(J))});Y.observe(c);let X=new ResizeObserver(V);return X.observe(c),o&&!l&&(c.addEventListener(`pointermove`,U),c.addEventListener(`pointerleave`,W)),()=>{cancelAnimationFrame(K),Y.disconnect(),X.disconnect(),c.removeEventListener(`pointermove`,U),c.removeEventListener(`pointerleave`,W),u.getExtension(`WEBGL_lose_context`)?.loseContext()}};export{n as t};