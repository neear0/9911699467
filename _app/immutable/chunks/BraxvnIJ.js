var e=(e,t,n=1.6)=>`
uniform vec4 RIP[4];
uniform float RIP_T;
float ripple(vec2 q){
  float s = 0.;
  for (int i = 0; i < 4; i++) {
    vec4 r = RIP[i];
    float age = RIP_T - r.z;
    if (r.w <= 0. || age < 0. || age > ${n.toFixed(2)}) continue;
    float b = length(q - r.xy) - age * ${e.toFixed(2)};
    s += r.w * exp(-b * b / ${(2*t*t).toFixed(2)}) * (1. - age / ${n.toFixed(2)}) * smoothstep(0., .2, age);
  }
  return s;
}`;function t(e,t=5){let n=new Float32Array(16),r=performance.now()/1e3,i=()=>performance.now()/1e3-r,a=0,o=1.2+Math.random()*1.5,s=(t,r,o=1)=>{e||(n.set([t,r,i(),o],a*4),a=(a+1)%4)};return{add:s,tick(n){if(e)return;let r=i();if(r<o)return;let[a,c]=n();s(a,c,.6),o=r+t*(.8+Math.random()*.5)},upload(e,t,r){e.uniform4fv(t,n),e.uniform1f(r,i())}}}var n=`#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }`,r=`#version 300 es
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
}`,i=`#version 300 es
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
${e(14,2.2)}

void main(){
  vec2 floor_xz = a_cell * PITCH;
  float b = texelFetch(FLOW, ivec2(round(a_cell + (N - 1.) / 2.)), 0).r;

  // entrance: cubes grow in a diagonal sweep
  float delay = (a_cell.x - a_cell.y + N) / (2. * N) * .9;
  float grow = clamp((GROW_T - delay) / .8, 0., 1.);
  grow = 1. - pow(1. - grow, 3.);

  float h = PITCH * max(.08, .15 + LIFT * b) * grow + .5;
  // a passing ring lifts the cubes a little and lights them
  float rp = ripple(a_cell);
  h += PITCH * rp * .9;
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
  v_col = col * (.35 + .65 * grow) * (1. + rp * .5);
}`,a=`#version 300 es
precision mediump float;
in vec3 v_col;
out vec4 o;
void main(){ o = vec4(v_col, 1.); }`;function o(){let e=[[[0,1,0],[[0,1,0],[1,1,0],[1,1,1],[0,1,1]]],[[0,-1,0],[[0,0,0],[0,0,1],[1,0,1],[1,0,0]]],[[1,0,0],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]]],[[-1,0,0],[[0,0,0],[0,1,0],[0,1,1],[0,0,1]]],[[0,0,1],[[0,0,1],[0,1,1],[1,1,1],[1,0,1]]],[[0,0,-1],[[0,0,0],[1,0,0],[1,1,0],[0,1,0]]]],t=[];for(let[n,r]of e)for(let e of[0,1,2,0,2,3])t.push(...r[e],...n);return new Float32Array(t)}var s=()=>matchMedia(`(prefers-reduced-motion: reduce)`).matches,c=({color:e=[.29,.5,1],pitch:c=16,lift:l=3.3,elevation:ee=40,hover:te=!0}={})=>u=>{let d=u.parentElement,f=s(),p=u.getContext(`webgl2`,{alpha:!1,antialias:!0});if(!p)return;let m=(e,t)=>{let n=p.createProgram();for(let[r,i]of[[p.VERTEX_SHADER,e],[p.FRAGMENT_SHADER,t]]){let e=p.createShader(r);p.shaderSource(e,i),p.compileShader(e),p.getShaderParameter(e,p.COMPILE_STATUS)||console.error(`cube_flow shader:`,p.getShaderInfoLog(e)),p.attachShader(n,e)}return p.linkProgram(n),p.getProgramParameter(n,p.LINK_STATUS)?n:null},h=m(n,r),g=m(i,a);if(!h||!g)return;let _=(e,t)=>Object.fromEntries(t.map(t=>[t,p.getUniformLocation(e,t)])),v=_(h,[`T`,`PITCH`,`N`,`R`,`EASE`,`PREV`,`MAX_STEP`]),y=_(g,[`FLOW`,`T`,`GROW_T`,`PITCH`,`LIFT`,`DEPTH`,`N`,`VIEW`,`R`,`C`,`HOVER`,`RIP`,`RIP_T`]),b=p.createVertexArray();p.bindVertexArray(b),p.bindBuffer(p.ARRAY_BUFFER,p.createBuffer()),p.bufferData(p.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),p.STATIC_DRAW);let x=p.getAttribLocation(h,`p`);p.enableVertexAttribArray(x),p.vertexAttribPointer(x,2,p.FLOAT,!1,0,0);let S=p.createVertexArray();p.bindVertexArray(S),p.bindBuffer(p.ARRAY_BUFFER,p.createBuffer()),p.bufferData(p.ARRAY_BUFFER,o(),p.STATIC_DRAW);let C=p.getAttribLocation(g,`a_pos`),w=p.getAttribLocation(g,`a_nrm`);p.enableVertexAttribArray(C),p.vertexAttribPointer(C,3,p.FLOAT,!1,24,0),p.enableVertexAttribArray(w),p.vertexAttribPointer(w,3,p.FLOAT,!1,24,12);let T=p.createBuffer(),E=p.getAttribLocation(g,`a_cell`);p.bindBuffer(p.ARRAY_BUFFER,T),p.enableVertexAttribArray(E),p.vertexAttribPointer(E,2,p.FLOAT,!1,0,0),p.vertexAttribDivisor(E,1);let D=[p.createTexture(),p.createTexture()];for(let e of D)p.bindTexture(p.TEXTURE_2D,e),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_MIN_FILTER,p.NEAREST),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_MAG_FILTER,p.NEAREST),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_WRAP_S,p.CLAMP_TO_EDGE),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_WRAP_T,p.CLAMP_TO_EDGE);let O=[p.createFramebuffer(),p.createFramebuffer()],ne=!!p.getExtension(`EXT_color_buffer_float`),k=0,A=-1,j=Math.PI/4,M=ee*Math.PI/180,[N,P,F,I]=[Math.cos(j),Math.sin(j),Math.cos(M),Math.sin(M)],L=[N,I*P,-F*P,0,F,I,P,-I*N,F*N];p.useProgram(h),p.uniformMatrix3fv(v.R,!1,L),p.uniform1i(v.PREV,0),p.useProgram(g),p.uniformMatrix3fv(y.R,!1,L),p.uniform3f(y.C,e[0],e[1],e[2]),p.uniform1f(y.LIFT,l),p.uniform1i(y.FLOW,0),p.clearColor(.024,.024,.059,1);let R=1,z=1,B=1,V=0,H=c,re=()=>{R=d.clientWidth,z=d.clientHeight;let e=Math.min(devicePixelRatio||1,1.5);u.width=Math.max(1,Math.round(R*e)),u.height=Math.max(1,Math.round(z*e));let t=H=c*Math.min(1.3,Math.max(.8,R/1440)),n=.71*(R/2+z/2/I)+t*4;B=Math.ceil(2*n/t);let r=new Float32Array(B*B*2);for(let e=0,t=0;e<B;e++)for(let n=0;n<B;n++,t+=2)r[t]=e-(B-1)/2,r[t+1]=n-(B-1)/2;V=B*B,p.bindBuffer(p.ARRAY_BUFFER,T),p.bufferData(p.ARRAY_BUFFER,r,p.STATIC_DRAW);for(let e=0;e<2;e++)p.bindTexture(p.TEXTURE_2D,D[e]),ne?p.texImage2D(p.TEXTURE_2D,0,p.RGBA16F,B,B,0,p.RGBA,p.HALF_FLOAT,null):p.texImage2D(p.TEXTURE_2D,0,p.RGBA8,B,B,0,p.RGBA,p.UNSIGNED_BYTE,null),p.bindFramebuffer(p.FRAMEBUFFER,O[e]),p.framebufferTexture2D(p.FRAMEBUFFER,p.COLOR_ATTACHMENT0,p.TEXTURE_2D,D[e],0);p.bindFramebuffer(p.FRAMEBUFFER,null),A=-1,p.useProgram(h),p.uniform1f(v.PITCH,t),p.uniform1f(v.N,B),p.useProgram(g),p.uniform1f(y.PITCH,t),p.uniform1f(y.N,B),p.uniform1f(y.DEPTH,B*t*2),p.uniform2f(y.VIEW,R,z),f&&X(performance.now())},U={x:0,y:0,on:!1,glow:0},W=e=>{if(e.pointerType!==`mouse`)return;let t=d.getBoundingClientRect();U.x=e.clientX-t.left-R/2,U.y=z/2-(e.clientY-t.top),U.on=!0},G=()=>U.on=!1,K=t(f,6),q=(e,t)=>{let n=L,r=n[0]*n[7]-n[6]*n[1];return[(e*n[7]-n[6]*t)/r/H,(n[0]*t-n[1]*e)/r/H]},J=e=>{let t=d.getBoundingClientRect(),[n,r]=q(e.clientX-t.left-R/2,z/2-(e.clientY-t.top));K.add(n,r,1)},ie=performance.now(),Y=0,X=e=>{let t=f?6:(e-ie)/1e3,n=(e-A)/1e3,r=A<0?1:1-Math.exp(-n*12),i=A<0?1:100*n/(l*H);U.glow+=(+!!U.on-U.glow)*(A<0?1:1-Math.exp(-n*8)),A=e,p.activeTexture(p.TEXTURE0),p.bindTexture(p.TEXTURE_2D,D[k]),k=1-k,p.bindFramebuffer(p.FRAMEBUFFER,O[k]),p.viewport(0,0,B,B),p.disable(p.DEPTH_TEST),p.useProgram(h),p.uniform1f(v.T,t),p.uniform1f(v.EASE,r),p.uniform1f(v.MAX_STEP,i),p.bindVertexArray(b),p.drawArrays(p.TRIANGLES,0,3),p.bindFramebuffer(p.FRAMEBUFFER,null),p.viewport(0,0,u.width,u.height),p.enable(p.DEPTH_TEST),p.useProgram(g),p.uniform1f(y.T,t),p.uniform1f(y.GROW_T,f?10:t),p.uniform3f(y.HOVER,U.x,U.y,U.glow),K.tick(()=>q((Math.random()-.5)*R*.9,(Math.random()-.5)*z*.8)),K.upload(p,y.RIP,y.RIP_T),p.bindTexture(p.TEXTURE_2D,D[k]),p.bindVertexArray(S),p.clear(p.COLOR_BUFFER_BIT|p.DEPTH_BUFFER_BIT),p.drawArraysInstanced(p.TRIANGLES,0,36,V)},Z=e=>{X(e),Y=requestAnimationFrame(Z)},Q=new IntersectionObserver(([e])=>{cancelAnimationFrame(Y),e.isIntersecting&&!f&&(Y=requestAnimationFrame(Z))});Q.observe(d);let $=new ResizeObserver(re);return $.observe(d),f||d.addEventListener(`pointerdown`,J),te&&!f&&(d.addEventListener(`pointermove`,W),d.addEventListener(`pointerleave`,G)),()=>{cancelAnimationFrame(Y),Q.disconnect(),$.disconnect(),d.removeEventListener(`pointermove`,W),d.removeEventListener(`pointerleave`,G),d.removeEventListener(`pointerdown`,J),p.getExtension(`WEBGL_lose_context`)?.loseContext()}};export{e as n,t as r,c as t};