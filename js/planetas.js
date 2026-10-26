/* Control de Finanzas — fondo "Planetas" en 3D (WebGL)
   Cada planeta se dibuja como una esfera real con su textura, luz, nubes y atmósfera.
   La textura se genera una sola vez en la tarjeta gráfica (por partes, para no trabar la app)
   y después solo se gira: dibujar un cuadro cuesta casi nada. Solo se anima el planeta que se ve.
   Si el teléfono no tiene WebGL, se queda el fondo sencillo de CSS. */
(function () {
  const App = window.App;

  const RUIDO = `
vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return m289(((x*34.0)+1.0)*x);}
vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=m289(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  vec3 ns=0.142857142857*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 nr=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nr.x; p1*=nr.y; p2*=nr.z; p3*=nr.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p,int o){float s=0.0,a=0.5;for(int i=0;i<9;i++){if(i>=o)break;s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}
`;

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  /* Textura de cada planeta (mapa como el de un globo terráqueo) */
  const HORNEAR = `precision highp float;
uniform vec2 uRes; uniform float uTipo; uniform float uCanal;
${RUIDO}
vec4 tierra(vec3 p, out vec2 extra){
  vec3 w=vec3(fbm(p*1.1+vec3(2.3,1.1,5.7),4),fbm(p*1.1+vec3(7.1,3.3,1.9),4),fbm(p*1.1+vec3(4.4,8.8,2.2),4));
  float h=0.62*snoise(p*0.95+w*0.55)+0.38*fbm(p*2.4+w*0.35,7);
  float lat=abs(p.y);
  float mar=0.12;
  float tie=smoothstep(mar-0.003,mar+0.003,h);
  float dep=clamp((mar-h)*3.2,0.0,1.0);
  vec3 oc=mix(vec3(0.07,0.40,0.58),vec3(0.015,0.07,0.23),pow(dep,0.55));
  oc=mix(oc,vec3(0.10,0.55,0.62),smoothstep(0.06,0.0,mar-h)*0.6);
  float hum=fbm(p*2.7+vec3(13.1),5);
  float alt=clamp((h-mar)*2.4,0.0,1.0);
  vec3 ver=mix(vec3(0.10,0.30,0.09),vec3(0.27,0.42,0.15),smoothstep(-0.2,0.3,hum));
  float seco=smoothstep(0.08,-0.22,hum)*smoothstep(0.62,0.22,lat);
  vec3 ti=mix(ver,vec3(0.74,0.60,0.38),seco);
  ti=mix(ti,vec3(0.38,0.33,0.26),smoothstep(0.30,0.6,alt));
  ti=mix(ti,vec3(0.48,0.47,0.40),smoothstep(0.55,0.78,lat));
  ti=mix(ti,vec3(0.93,0.94,0.96),smoothstep(0.78,0.95,alt+lat*0.3));
  vec3 c=mix(oc,ti,tie);
  c*=0.9+0.2*fbm(p*20.0,3);
  float hie=smoothstep(0.83,0.88,lat+0.05*fbm(p*7.0,3)+0.03*tie);
  c=mix(c,vec3(0.93,0.96,1.0),hie);
  vec3 q=p*1.4+vec3(fbm(p*1.8,3),fbm(p*1.8+5.2,3),fbm(p*1.8+9.1,3))*0.55;
  float gran=snoise(p*1.2+vec3(6.0,1.0,3.0));
  float nb=fbm(q*2.0,5)*0.8+0.45*gran-0.08;
  nb+=0.18*smoothstep(0.25,0.0,abs(lat-0.58))+0.1*smoothstep(0.12,0.0,lat);
  float nube=smoothstep(0.14,0.7,nb)*0.82;
  float luces=tie*(1.0-hie)*smoothstep(0.7,0.25,lat)*smoothstep(0.25,0.7,fbm(p*55.0,3)*0.5+0.5+0.35*fbm(p*4.0+3.0,3))*(1.0-smoothstep(0.35,0.8,alt));
  extra=vec2(luces,1.0-tie);
  return vec4(c,nube);
}
vec4 marte(vec3 p){
  vec3 w=vec3(fbm(p*1.5+3.0,3),fbm(p*1.5+7.0,3),fbm(p*1.5+11.0,3));
  float h=fbm(p*1.4+w*0.7,8);
  vec3 c=mix(vec3(0.50,0.20,0.10),vec3(0.80,0.42,0.21),smoothstep(-0.4,0.35,h));
  float ma=smoothstep(-0.02,-0.3,fbm(p*0.9+vec3(4.0),5));
  c=mix(c,vec3(0.30,0.14,0.08),ma*0.75);
  c=mix(c,vec3(0.88,0.60,0.38),smoothstep(0.3,0.55,fbm(p*3.0+1.0,4))*0.45);
  c*=0.86+0.28*(fbm(p*18.0,4)*0.5+0.5);
  float po=smoothstep(0.87,0.91,abs(p.y)+0.04*fbm(p*8.0,3));
  c=mix(c,vec3(0.96,0.94,0.92),po);
  return vec4(c,0.0);
}
vec4 saturno(vec3 p){
  float t=p.y+0.022*fbm(p*vec3(3.0,14.0,3.0),4)+0.008*fbm(p*vec3(9.0,40.0,9.0),3);
  float b=sin(t*26.0)*0.5+sin(t*57.0+1.0)*0.3+sin(t*113.0+2.0)*0.2;
  vec3 c=mix(vec3(0.78,0.62,0.40),vec3(0.96,0.88,0.68),smoothstep(-0.6,0.6,b));
  c=mix(c,vec3(0.86,0.72,0.48),smoothstep(0.12,0.0,abs(p.y))*0.4);
  c=mix(c,vec3(0.56,0.60,0.64),smoothstep(0.72,0.95,abs(p.y)));
  return vec4(c,0.0);
}
vec4 neptuno(vec3 p){
  float t=p.y+0.05*fbm(p*vec3(2.0,9.0,2.0),4);
  vec3 c=mix(vec3(0.14,0.29,0.78),vec3(0.27,0.50,0.96),0.5+0.5*sin(t*13.0));
  c=mix(c,vec3(0.08,0.17,0.58),smoothstep(0.65,0.95,abs(p.y))*0.6);
  vec3 ce=vec3(cos(-0.36)*cos(0.8),sin(-0.36),cos(-0.36)*sin(0.8));
  float e=length((p-ce)*vec3(1.0,2.3,1.0));
  c=mix(c,vec3(0.05,0.10,0.40),smoothstep(0.17,0.09,e));
  vec3 ce2=vec3(cos(-0.47)*cos(0.86),sin(-0.47),cos(-0.47)*sin(0.86));
  c=mix(c,vec3(0.95,0.97,1.0),smoothstep(0.07,0.02,length((p-ce2)*vec3(1.0,3.0,1.0)))*0.9);
  float s=fbm(p*vec3(2.5,26.0,2.5)+3.0,5);
  c=mix(c,vec3(0.92,0.95,1.0),smoothstep(0.3,0.6,s)*0.85*smoothstep(0.3,0.05,abs(p.y-0.25)));
  c=mix(c,vec3(0.92,0.95,1.0),smoothstep(0.35,0.6,s)*0.6*smoothstep(0.2,0.05,abs(p.y+0.55)));
  return vec4(c,0.0);
}
vec4 luna(vec3 p){
  float h=fbm(p*2.2,7);
  vec3 c=vec3(0.66)+0.16*h;
  c=mix(c,vec3(0.34,0.34,0.36),smoothstep(0.0,-0.3,fbm(p*1.3+2.0,4))*0.75);
  c*=0.82+0.36*(fbm(p*16.0,4)*0.5+0.5);
  return vec4(c,0.0);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float lon=(uv.x-0.5)*6.2831853; float la=(uv.y-0.5)*3.14159265;
  vec3 p=vec3(cos(la)*cos(lon),sin(la),cos(la)*sin(lon));
  vec4 c; vec2 ex=vec2(0.0);
  if(uTipo<0.5) c=tierra(p,ex); else if(uTipo<1.5) c=marte(p); else if(uTipo<2.5) c=saturno(p); else if(uTipo<3.5) c=neptuno(p); else c=luna(p);
  gl_FragColor = uCanal>0.5 ? vec4(ex,0.0,1.0) : c;
}`;

  /* Dibujo de la esfera: luz, nubes, brillo del mar, luces de ciudades, atmósfera y anillos */
  const ESFERA = `precision highp float;
uniform sampler2D uTex; uniform sampler2D uTex2;
uniform vec2 uRes; uniform float uEsc; uniform float uRot; uniform float uNube; uniform float uTipo;
uniform mat3 uT; uniform mat3 uTi; uniform vec3 uL; uniform vec3 uAtm; uniform float uAtmF;
vec4 anillo(float rr){
  float x=(rr-1.24)/(2.32-1.24);
  float d=0.55+0.22*sin(x*90.0)+0.13*sin(x*231.0+1.3)+0.08*sin(x*517.0);
  d*=smoothstep(0.0,0.05,x)*(1.0-smoothstep(0.94,1.0,x));
  d*=mix(0.3,1.0,smoothstep(0.17,0.24,x));
  d*=1.0-0.93*(smoothstep(0.62,0.635,x)-smoothstep(0.675,0.69,x));
  d*=1.0-0.8*(smoothstep(0.86,0.865,x)-smoothstep(0.872,0.877,x));
  vec3 c=mix(vec3(0.74,0.64,0.50),vec3(0.96,0.89,0.76),0.5+0.5*sin(x*37.0));
  return vec4(c,clamp(d,0.0,1.0)*0.93);
}
void main(){
  vec2 c=(gl_FragCoord.xy/uRes*2.0-1.0)*uEsc;
  float px=2.0*uEsc/uRes.x;
  float r=length(c);
  vec3 L=normalize(uL);
  vec3 pc=vec3(0.0); float pa=0.0;
  float zs=-1e4;
  if(r<1.0+px){
    float z=sqrt(max(0.0,1.0-r*r)); vec3 n=vec3(c,z);
    vec3 q=uTi*n; float cr=cos(uRot), sr=sin(uRot);
    vec3 pl=vec3(cr*q.x-sr*q.z,q.y,sr*q.x+cr*q.z);
    vec2 uv=vec2(atan(pl.z,pl.x)/6.2831853+0.5, asin(clamp(pl.y,-1.0,1.0))/3.14159265+0.5);
    vec4 t=texture2D(uTex,uv);
    float nl=dot(n,L);
    float luz=smoothstep(-0.12,0.55,nl)*1.05+0.025;
    vec3 col=t.rgb;
    if(uTipo<0.5){
      vec4 e=texture2D(uTex2,uv);
      float nb=texture2D(uTex,uv+vec2(uNube,0.0)).a;
      float sb=texture2D(uTex,uv+vec2(uNube+0.006,-0.004)).a;
      col*=1.0-0.4*sb*(1.0-nb);
      vec3 h=normalize(L+vec3(0.0,0.0,1.0));
      float spec=pow(max(dot(n,h),0.0),55.0)*e.g*(1.0-nb)*0.75;
      col=col*luz+spec*vec3(1.0,0.95,0.85)*smoothstep(0.0,0.3,nl);
      col=mix(col,vec3(1.0)*(luz*1.02),nb);
      float noche=1.0-smoothstep(-0.2,0.08,nl);
      col+=e.r*noche*(1.0-nb*0.85)*vec3(1.0,0.72,0.38)*1.25;
    } else col*=luz;
    if(uTipo>1.5&&uTipo<2.5){
      vec3 N=uT*vec3(0.0,1.0,0.0); float dn=dot(N,L);
      if(abs(dn)>1e-3){ float tt=-dot(N,n)/dn; if(tt>0.0){ float rr=length(n+tt*L); if(rr>1.24&&rr<2.32) col*=1.0-0.8*anillo(rr).a; } }
    }
    float fr=pow(1.0-z,2.2);
    col+=uAtm*fr*uAtmF*0.9*smoothstep(-0.35,0.6,nl);
    col=mix(col,uAtm*luz,0.06*uAtmF);
    float a=1.0-smoothstep(1.0-px*1.2,1.0+px*0.2,r);
    pc=col*a; pa=a; zs=z;
  }
  if(uTipo>1.5&&uTipo<2.5){
    vec3 N=uT*vec3(0.0,1.0,0.0);
    if(abs(N.z)>1e-3){
      float z=-(N.x*c.x+N.y*c.y)/N.z; vec3 P=vec3(c,z); float rr=length(P);
      if(rr>1.24&&rr<2.32&&!(pa>0.5&&zs>z)){
        vec4 g=anillo(rr);
        float b=dot(P,L); float d=b*b-(dot(P,P)-1.0);
        float som=(b<0.0&&d>0.0)?0.12:1.0;
        vec3 rc=g.rgb*(0.35+0.85*abs(dot(N,L)))*som;
        pc=rc*g.a+pc*(1.0-g.a); pa=g.a+pa*(1.0-g.a);
      }
    }
  }
  if(uAtmF>0.0&&r>1.0-px*2.0){
    float g=1.0-smoothstep(1.0,1.0+0.14*uAtmF,r); g*=g;
    float f=smoothstep(-0.7,0.7,dot(normalize(c),normalize(L.xy)));
    vec3 gw=uAtm*g*(0.15+0.85*f)*uAtmF;
    pc+=gw*(1.0-pa); pa+=g*0.35*f*uAtmF*(1.0-pa);
  }
  gl_FragColor=vec4(pc,pa);
}`;

  // [nombre, tipo, tamaño textura, escala lienzo, inclinación (z, x), giro (s por vuelta), luz, atmósfera, fuerza]
  const DEF = {
    tierra: { tipo: 0, tex: 2048, esc: 1.3, inc: [-0.38, 0.12], vuelta: 140, nube: 1 / 900, luz: [-0.62, 0.42, 0.66], atm: [0.35, 0.62, 1.0], atmF: 1.0 },
    marte: { tipo: 1, tex: 1024, esc: 1.25, inc: [0.3, 0.1], vuelta: 170, luz: [-0.62, 0.4, 0.67], atm: [1.0, 0.58, 0.38], atmF: 0.45 },
    saturno: { tipo: 2, tex: 1024, esc: 2.45, inc: [-0.32, 0.42], vuelta: 90, luz: [-0.55, 0.5, 0.67], atm: [0.95, 0.85, 0.62], atmF: 0.3 },
    neptuno: { tipo: 3, tex: 1024, esc: 1.3, inc: [0.22, 0.08], vuelta: 110, luz: [-0.6, 0.35, 0.72], atm: [0.35, 0.58, 1.0], atmF: 1.0 },
    luna: { tipo: 4, tex: 512, esc: 1.0, inc: [0, 0], vuelta: 0, luz: [-0.62, 0.42, 0.66], atm: [0, 0, 0], atmF: 0 }
  };
  const PANT = { inicio: 'tierra', movs: 'marte', metas: 'saturno', ajustes: 'neptuno' };
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2.5);

  const mat = (az, ax) => { // Rz(az) * Rx(ax), en columnas
    const cz = Math.cos(az), sz = Math.sin(az), cx = Math.cos(ax), sx = Math.sin(ax);
    const m = [[cz, -sz * cx, sz * sx], [sz, cz * cx, -cz * sx], [0, sx, cx]]; // filas
    const col = (M) => [M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2], M[2][2]];
    const tr = [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
    return { T: col(m), Ti: col(tr) };
  };

  const programa = (gl, fs) => {
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const k = gl.getActiveUniform(p, i).name; u[k] = gl.getUniformLocation(p, k); }
    return { p, u };
  };

  /* Un planeta: su lienzo, su textura y su función para dibujarse */
  const crear = (nombre, lienzo, alListo) => {
    const d = DEF[nombre];
    const gl = lienzo.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: nombre === 'luna', powerPreference: 'low-power' });
    if (!gl) throw new Error('sin webgl');
    const pl = { nombre, d, gl, lienzo, listo: false, ang: Math.random() * 6.28, nube: 0 };
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const hornear = programa(gl, HORNEAR);
    pl.esfera = programa(gl, ESFERA);
    const tex = (w, h) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { t, fb, w, h };
    };
    const W = d.tex, H = d.tex / 2;
    pl.t1 = tex(W, H);
    pl.t2 = d.tipo === 0 ? tex(W / 2, H / 2) : pl.t1;
    // se hornea por franjas, una por cuadro, para que nada se trabe
    const tareas = [];
    const franjas = (T, canal) => { const n = Math.max(1, T.h / 64); for (let i = 0; i < n; i++) tareas.push([T, canal, i * 64, Math.min(64, T.h - i * 64)]); };
    franjas(pl.t1, 0); if (d.tipo === 0) franjas(pl.t2, 1);
    pl.paso = () => {
      const tarea = tareas.shift();
      if (!tarea) return true;
      const [T, canal, y0, alto] = tarea;
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
      gl.viewport(0, y0, T.w, alto); // dibuja solo esa franja (gl_FragCoord sigue siendo la fila real)
      gl.useProgram(hornear.p);
      gl.uniform2f(hornear.u.uRes, T.w, T.h); gl.uniform1f(hornear.u.uTipo, d.tipo); gl.uniform1f(hornear.u.uCanal, canal);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!tareas.length) { pl.listo = true; if (alListo) alListo(pl); return true; }
      return false;
    };
    const M = mat(d.inc[0], d.inc[1]);
    pl.medir = () => {
      const css = lienzo.offsetWidth;
      if (!css) return; // fuera de la pantalla (la luna): se queda su tamaño
      const px = Math.round(css * DPR());
      if (lienzo.width !== px) { lienzo.width = px; lienzo.height = px; }
    };
    pl.dibujar = (dt) => {
      if (!pl.listo) return;
      if (d.vuelta) { pl.ang += dt / d.vuelta * 6.2832; pl.nube += dt * (d.nube || 0); }
      pl.medir();
      const u = pl.esfera.u;
      gl.viewport(0, 0, lienzo.width, lienzo.height);
      gl.useProgram(pl.esfera.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pl.t1.t); gl.uniform1i(u.uTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pl.t2.t); gl.uniform1i(u.uTex2, 1);
      gl.uniform2f(u.uRes, lienzo.width, lienzo.height); gl.uniform1f(u.uEsc, d.esc);
      gl.uniform1f(u.uRot, pl.ang); gl.uniform1f(u.uNube, pl.nube % 1); gl.uniform1f(u.uTipo, d.tipo);
      gl.uniformMatrix3fv(u.uT, false, M.T); gl.uniformMatrix3fv(u.uTi, false, M.Ti);
      gl.uniform3fv(u.uL, d.luz); gl.uniform3fv(u.uAtm, d.atm); gl.uniform1f(u.uAtmF, d.atmF);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    return pl;
  };

  /* ---------------- control ---------------- */
  const P = {}; // planetas creados
  let cosmos = null, activos = {}, raf = 0, ultimo = 0, fallo = false;
  const quieto = () => U.sinMovimiento();
  const enUso = () => document.body.dataset.fondo === 'planetas' && !document.hidden;

  const asegurar = (nombre) => {
    if (P[nombre] || fallo || !cosmos) return P[nombre];
    const el = cosmos.querySelector('.pl.' + nombre);
    if (!el) return null;
    const cv = document.createElement('canvas'); cv.className = 'gl';
    el.insertBefore(cv, el.firstChild);
    try {
      P[nombre] = crear(nombre, cv, (pl) => { pl.lienzo.classList.add('listo'); pl.dibujar(0); });
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); delete P[nombre]; cv.remove(); }, false);
    } catch (e) {
      cv.remove(); fallo = true; cosmos.classList.remove('gl');
      return null;
    }
    return P[nombre];
  };

  // la luna se dibuja una sola vez y se guarda como imagen
  const luna = () => {
    const el = cosmos && cosmos.querySelector('.luna');
    if (!el || el.dataset.gl) return;
    try {
      const cv = document.createElement('canvas'); cv.width = cv.height = Math.round(120 * DPR());
      const pl = crear('luna', cv);
      while (!pl.paso()) { /* hornea todo */ }
      pl.dibujar(0);
      el.style.backgroundImage = 'url(' + cv.toDataURL('image/png') + ')';
      el.dataset.gl = '1';
      const ext = pl.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    } catch (e) { /* se queda la luna sencilla */ }
  };

  const cuadro = (ts) => {
    raf = 0;
    if (!enUso()) return;
    const dt = ultimo ? Math.min(0.1, (ts - ultimo) / 1000) : 0;
    // ~30 cuadros por segundo: el giro es lento y así gasta menos batería
    if (ultimo && ts - ultimo < 30) { raf = requestAnimationFrame(cuadro); return; }
    ultimo = ts;
    const ahora = Date.now();
    Object.keys(activos).forEach((n) => { if (activos[n] && activos[n] < ahora) delete activos[n]; });
    let falta = false;
    Object.keys(activos).forEach((n) => {
      const pl = asegurar(n); if (!pl) return;
      if (!pl.listo) { pl.paso(); falta = true; return; }
      pl.dibujar(quieto() ? 0 : dt);
    });
    // con el planeta visible listo, prepara los demás poco a poco
    if (!falta) {
      const sig = Object.keys(PANT).map((k) => PANT[k]).find((n) => !P[n] || !P[n].listo);
      if (sig && !fallo) { const pl = asegurar(sig); if (pl && !pl.listo) { pl.paso(); falta = true; } }
    }
    if (!quieto() || falta) raf = requestAnimationFrame(cuadro);
  };
  const arrancar = () => { if (!raf && enUso()) { ultimo = 0; raf = requestAnimationFrame(cuadro); } };

  const actualizar = () => {
    if (!cosmos || fallo) return;
    const actual = PANT[document.body.dataset.pantalla] || 'tierra';
    // el que se va sigue girando mientras sale (1.9 s); luego se pausa
    Object.keys(activos).forEach((n) => { if (n !== actual && !activos[n]) activos[n] = Date.now() + 1900; });
    activos[actual] = 0;
    arrancar();
    if (quieto()) setTimeout(arrancar, 50);
  };

  App.planetas3D = {
    montar: (c) => {
      cosmos = c;
      const prueba = document.createElement('canvas');
      let ok = false;
      try {
        const g = window.WebGLRenderingContext && prueba.getContext('webgl');
        ok = !!g;
        const ext = g && g.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      } catch (e) { ok = false; }
      if (!ok) { fallo = true; return; }
      c.classList.add('gl');
      luna();
      actualizar();
    },
    actualizar
  };

  new MutationObserver(actualizar).observe(document.body, { attributes: true, attributeFilter: ['data-pantalla', 'data-fondo'] });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
  window.addEventListener('resize', () => { Object.keys(P).forEach((n) => { if (P[n].listo && activos[n] !== undefined) P[n].dibujar(0); }); });
})();
