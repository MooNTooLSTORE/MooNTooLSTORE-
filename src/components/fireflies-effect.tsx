"use client";

import React, { useRef, useEffect } from 'react';

type FirefliesEffectProps = {
    count?: number;
    speed?: number;
};

const FirefliesEffect: React.FC<FirefliesEffectProps> = ({ count = 155, speed = 56 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
            }
        };

        const fireflies: { x: number; y: number; vx: number; vy: number; radius: number; alpha: number; va: number }[] = [];
        
        const actualSpeed = speed / 100;

        const initFireflies = () => {
            for (let i = 0; i < count; i++) {
                fireflies.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * actualSpeed,
                    vy: (Math.random() - 0.5) * actualSpeed,
                    radius: Math.random() * 1.5 + 0.5,
                    alpha: Math.random(),
                    va: Math.random() * 0.04 - 0.02, // Alpha velocity
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const firefly of fireflies) {
                firefly.x += firefly.vx;
                firefly.y += firefly.vy;
                firefly.alpha += firefly.va;

                if (firefly.x < 0 || firefly.x > canvas.width) firefly.vx *= -1;
                if (firefly.y < 0 || firefly.y > canvas.height) firefly.vy *= -1;
                if (firefly.alpha < 0 || firefly.alpha > 1) firefly.va *= -1;

                ctx.beginPath();
                const gradient = ctx.createRadialGradient(firefly.x, firefly.y, 0, firefly.x, firefly.y, firefly.radius * 2);
                gradient.addColorStop(0, `rgba(0, 150, 255, ${firefly.alpha * 0.8})`);
                gradient.addColorStop(1, `rgba(0, 150, 255, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.arc(firefly.x, firefly.y, firefly.radius * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        initFireflies();
        animate();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [count, speed]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />;
};

export default FirefliesEffect;
