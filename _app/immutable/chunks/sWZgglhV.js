import{n as e,r as t}from"./BraxvnIJ.js";var n=11,r=`#version 300 es
in vec3 a_pos;     // unit cube, -.5...5
in vec3 a_nrm;
in vec4 a_inst;    // place in cells (from the middle), size
in vec3 a_col;
in vec4 a_rot;     // turn: axis, angle
uniform mat3 R;
uniform float CELL, PERSP;
uniform vec2 VIEW, CENTER;
out vec3 v_col;
${e(9,1.4)}
vec3 turn(vec3 v, vec4 q){
  if (q.w == 0.) return v;
  vec3 k = normalize(q.xyz);
  float c = cos(q.w), s = sin(q.w);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c);
}
void main(){
  // a passing ring lifts the cube a little and lights it
  float rp = ripple(a_inst.xz);
  vec3 p = R * (a_inst.xyz + vec3(0., rp * .3, 0.) + turn(a_pos, a_rot) * a_inst.w) * CELL;
  float k = PERSP / (PERSP - p.z);
  gl_Position = vec4((p.x * k + CENTER.x) / (VIEW.x * .5), (p.y * k + CENTER.y) / (VIEW.y * .5), -p.z / (PERSP * 2.), 1.);
  vec3 n = R * turn(a_nrm, a_rot);
  float lit = .26 + .74 * max(dot(n, normalize(vec3(-.45, .65, .65))), 0.);
  vec3 col = a_col * lit * (1. + rp * .4);
  col += a_col * .14 * smoothstep(.6, 1., n.y);   // the tops catch the light
  v_col = col;
}`,i=`#version 300 es
precision mediump float;
in vec3 v_col;
out vec4 o;
void main(){ o = vec4(v_col, 1.); }`;function a(){let e=[[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]],[[0,1,0],[[0,1,0],[0,1,1],[1,1,1],[1,1,0]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],[[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]]],t=[];for(let[n,r]of e)for(let e of[0,1,2,0,2,3])t.push(r[e][0]-.5,r[e][1]-.5,r[e][2]-.5,...n);return new Float32Array(t)}function o(e,o,s){let c=e.getContext(`webgl2`,{alpha:!1,antialias:!0});if(!c)return null;let l=c.createProgram();for(let[e,t]of[[c.VERTEX_SHADER,r],[c.FRAGMENT_SHADER,i]]){let n=c.createShader(e);c.shaderSource(n,t),c.compileShader(n),c.getShaderParameter(n,c.COMPILE_STATUS)||console.error(`cube_scene shader:`,c.getShaderInfoLog(n)),c.attachShader(l,n)}if(c.linkProgram(l),!c.getProgramParameter(l,c.LINK_STATUS))return null;c.useProgram(l);let u=Object.fromEntries([`R`,`CELL`,`PERSP`,`VIEW`,`CENTER`,`RIP`,`RIP_T`].map(e=>[e,c.getUniformLocation(l,e)]));c.bindVertexArray(c.createVertexArray()),c.bindBuffer(c.ARRAY_BUFFER,c.createBuffer()),c.bufferData(c.ARRAY_BUFFER,a(),c.STATIC_DRAW);let d=e=>c.getAttribLocation(l,e);c.enableVertexAttribArray(d(`a_pos`)),c.vertexAttribPointer(d(`a_pos`),3,c.FLOAT,!1,24,0),c.enableVertexAttribArray(d(`a_nrm`)),c.vertexAttribPointer(d(`a_nrm`),3,c.FLOAT,!1,24,12);let f=c.createBuffer();c.bindBuffer(c.ARRAY_BUFFER,f);for(let[e,t,n]of[[`a_inst`,4,0],[`a_col`,3,16],[`a_rot`,4,28]])c.enableVertexAttribArray(d(e)),c.vertexAttribPointer(d(e),t,c.FLOAT,!1,44,n),c.vertexAttribDivisor(d(e),1);c.clearColor(.024,.024,.059,1),c.enable(c.DEPTH_TEST);let p=new Float32Array(o*n),m=0,h=t(s);return{put(e,t,r,i,a,s=1,c=0,l=1,u=0,d=0){if(i<=.01||m>=o)return;let f=m++*n;p[f]=e,p[f+1]=t,p[f+2]=r,p[f+3]=i,p[f+4]=Math.min(1,a[0]*s),p[f+5]=Math.min(1,a[1]*s),p[f+6]=Math.min(1,a[2]*s),p[f+7]=c,p[f+8]=l,p[f+9]=u,p[f+10]=d},begin(){m=0},count:()=>m,at:e=>[p[e*n],p[e*n+1],p[e*n+2]],viewport(e,t){c.viewport(0,0,e,t)},draw(e,t,r,i,a){h.tick(()=>{let e=Math.floor(Math.random()*Math.max(1,m))*n;return[p[e],p[e+2]]}),c.bindBuffer(c.ARRAY_BUFFER,f),c.bufferData(c.ARRAY_BUFFER,p.subarray(0,m*n),c.STREAM_DRAW),c.uniformMatrix3fv(u.R,!1,e),c.uniform1f(u.CELL,t),c.uniform1f(u.PERSP,t*90),c.uniform2f(u.VIEW,r,i),c.uniform2f(u.CENTER,a.x,a.y),h.upload(c,u.RIP,u.RIP_T),c.clear(c.COLOR_BUFFER_BIT|c.DEPTH_BUFFER_BIT),c.drawArraysInstanced(c.TRIANGLES,0,36,m)},ripples:h,lose(){c.getExtension(`WEBGL_lose_context`)?.loseContext()}}}function s(e,t,n){let[r,i,a,o]=[Math.cos(t),Math.sin(t),Math.cos(n),Math.sin(n)];e.set([r,o*i,-a*i,0,a,o,i,-o*r,a*r])}function c(e,t,n,r,i,a,o,s){let c=(e[0]*a+e[3]*o+e[6]*s)*t,l=(e[1]*a+e[4]*o+e[7]*s)*t,u=(e[2]*a+e[5]*o+e[8]*s)*t,d=t*90/(t*90-u);return{x:n/2+i.x+c*d,y:r/2-(i.y+l*d)}}function l(e,t,n,r){let i=n.getBoundingClientRect(),a=t.clientX-i.left,o=t.clientY-i.top,s=-1,c=8100;for(let t=0;t<e.count();t++){let n=r(...e.at(t)),i=(n.x-a)**2+(n.y-o)**2;i<c&&(c=i,s=t)}if(s>=0){let[t,,n]=e.at(s);e.ripples.add(t,n,1)}}export{s as i,c as n,l as r,o as t};