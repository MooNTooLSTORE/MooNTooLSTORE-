"use client";

import React, { useRef, useEffect } from 'react';

export function PlexusBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let points: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];

    const options = {
      pointColor: 'hsl(51, 97%, 66%)', // primary color
      lineColor: 'hsl(0, 0%, 20%)',   // border color
      pointAmount: 50,
      defaultRadius: 4,
      variantRadius: 2,
      defaultSpeed: 0.05,
      variantSpeed: 0.05,
      linkRadius: 200,
    };

    function createPoints() {
      for (let i = 0; i < options.pointAmount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const vx = (Math.random() - 0.5) * options.defaultSpeed * 2;
        const vy = (Math.random() - 0.5) * options.defaultSpeed * 2;
        const radius = options.defaultRadius + Math.random() * options.variantRadius;
        points.push({ x, y, vx, vy, radius });
      }
    }

    function drawPoint(point: typeof points[0]) {
      if(!ctx) return;
      ctx.beginPath();
      ctx.fillStyle = options.pointColor;
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    function drawLine(p1: typeof points[0], p2: typeof points[0]) {
        if(!ctx) return;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < options.linkRadius) {
            ctx.beginPath();
            ctx.strokeStyle = options.lineColor;
            ctx.globalAlpha = (options.linkRadius - dist) / options.linkRadius;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    function updatePoints() {
      for (let p1 of points) {
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x > width + 50) p1.x = -50;
        if (p1.x < -50) p1.x = width + 50;
        if (p1.y > height + 50) p1.y = -50;
        if (p1.y < -50) p1.y = height + 50;

        drawPoint(p1);

        for (let p2 of points) {
          if (p1 !== p2) {
            drawLine(p1, p2);
          }
        }
      }
    }
    
    let animationFrameId: number;

    function animate() {
      if(!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      updatePoints();
      animationFrameId = requestAnimationFrame(animate);
    }
    
    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        points = [];
        createPoints();
    };

    window.addEventListener('resize', handleResize);
    createPoints();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />;
}
