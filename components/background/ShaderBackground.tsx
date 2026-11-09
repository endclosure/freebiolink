'use client';

import React, { useEffect, useRef, useState } from 'react';

const STAR_COUNT = 180;

function initStars(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.2 + 0.3,
    a: Math.random(),
    speed: Math.random() * 0.003 + 0.001,
    phase: Math.random() * Math.PI * 2,
  }));

  let raf: number;
  let t = 0;

  function draw() {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    t += 1;
    for (const s of stars) {
      const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx!.beginPath();
      ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx!.fill();
    }
    raf = requestAnimationFrame(draw);
  }

  draw();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}

interface ShaderBackgroundProps {
  color?: [number, number, number];
  speedMultiplier?: number;
  fadeOnScroll?: boolean;
}

export default function ShaderBackground({
  color = [1.0, 0.52, 0.78],
  speedMultiplier = 1.0,
  fadeOnScroll = true,
}: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const colorRef = useRef(color);
  const [shaderReady, setShaderReady] = useState(false);

  useEffect(() => { colorRef.current = color; }, [color]);

  useEffect(() => {
    const starsCanvas = starsRef.current;
    let cleanupStars: (() => void) | undefined;
    if (starsCanvas) {
      cleanupStars = initStars(starsCanvas);
    }

    const canvas = canvasRef.current;
    if (!canvas) return cleanupStars;

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) return cleanupStars;

    const RES_W = 640;
    const RES_H = 360;
    const SPEED = 0.52 * speedMultiplier;
    const ROT_ZOOM = 0.14;
    const DIST_STEP = 0.0055;
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
    const MAX_ITER = isMobile ? 70 : 50;
    const MIN_ITER = 10;

    canvas.width = RES_W;
    canvas.height = RES_H;

    const VERT = `#version 300 es
in vec2 position;
out vec2 vScreen;
void main() {
  vScreen = position;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

    const FRAG = `#version 300 es
precision highp float;
uniform float iTime;
uniform float rotZoom;
uniform float distStep;
uniform vec3  color;
uniform float iterations;
in vec2 vScreen;
out vec4 fragColor;
void main() {
  float t = iTime * 0.32;
  vec3 d = -.22 * vec3(vScreen, 1.);
  vec3 c = vec3(0.);
  float dist = 0.;
  for (int i = 0; i < int(iterations); ++i) {
    vec3 p = c;
    dist += distStep;
    p.z -= t + dist;
    p.z *= rotZoom;
    float angle = p.z + sin(p.z * 0.45 + t * 0.6) * 0.42;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    p.xy = rot * p.xy;
    c += length(sin(p.yx * 0.72) + cos(p.xz * 0.72 + t)) * d;
  }
  float glow = 2.8 / (length(c) + 0.038);
  vec3 highlight = vec3(1.0, 0.92, 0.98);
  vec3 finalColor = mix(color, highlight, clamp((glow - 1.0) * 0.45, 0.0, 0.9)) * glow * 0.72;
  fragColor = vec4(finalColor, 1.);
}`;

    function compile(type: number, src: string): WebGLShader | null {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return cleanupStars;

    const prog = gl.createProgram();
    if (!prog) return cleanupStars;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return cleanupStars;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uTime = u('iTime');
    const uIter = u('iterations');
    gl.uniform1f(u('rotZoom'), ROT_ZOOM);
    gl.uniform1f(u('distStep'), DIST_STEP);
    gl.uniform3fv(u('color'), colorRef.current);

    gl.viewport(0, 0, RES_W, RES_H);

    function fit() {
      if (!canvas) return;
      const s = Math.max(window.innerWidth / RES_W, window.innerHeight / RES_H);
      canvas.style.width = `${RES_W * s}px`;
      canvas.style.height = `${RES_H * s}px`;
    }

    window.addEventListener('resize', fit);
    fit();

    if (timeRef.current === 0) timeRef.current = Math.random() * 100;
    let iterations = MAX_ITER;
    let last = performance.now();
    let frames = 0;
    let fpsStamp = last;
    let raf = 0;
    let motionScale = 1;

    function draw() {
      if (!gl) return;
      gl.uniform3fv(u('color'), colorRef.current);
      gl.uniform1f(uTime, timeRef.current);
      gl.uniform1f(uIter, iterations);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      timeRef.current += SPEED * motionScale * dt;
      draw();

      frames++;
      if (now - fpsStamp >= 1000) {
        if (frames < 30 && iterations > MIN_ITER) iterations = Math.max(MIN_ITER, iterations - 5);
        else if (frames > 50 && iterations < MAX_ITER) iterations = Math.min(MAX_ITER, iterations + 5);
        frames = 0;
        fpsStamp = now;
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf) return;
      last = performance.now();
      fpsStamp = last;
      frames = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function applyMotionPref() {
      motionScale = reduceQuery.matches ? 0.5 : 1;
      if (!document.hidden) start();
      else stop();
    }

    reduceQuery.addEventListener('change', applyMotionPref);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else applyMotionPref();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    draw();
    canvas.classList.add('loaded');
    setShaderReady(true);
    applyMotionPref();

    let hasScrolled = false;
    const onScroll = () => {
      if (!fadeOnScroll || !canvas) return;
      if (!hasScrolled) {
        hasScrolled = true;
        canvas.style.transition = 'opacity 0.1s linear';
      }
      const progress = Math.min(window.scrollY / (window.innerHeight * 0.75), 1);
      canvas.style.opacity = String(1 - progress);
    };

    if (fadeOnScroll) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      stop();
      cleanupStars?.();
      window.removeEventListener('resize', fit);
      if (fadeOnScroll) {
        window.removeEventListener('scroll', onScroll);
      }
      reduceQuery.removeEventListener('change', applyMotionPref);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (gl) {
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      }
    };
  }, [speedMultiplier, fadeOnScroll]);

  return (
    <div
      className="bg-wrap fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="shader-fallback"
        style={{
          zIndex: 0,
          opacity: shaderReady ? 0 : 1,
          transition: 'opacity 1.2s ease',
        }}
      />
      <canvas
        ref={starsRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <canvas
        id="bg"
        ref={canvasRef}
        draggable={false}
        className="pointer-events-none"
        style={{ zIndex: 2 }}
      />
    </div>
  );
}
