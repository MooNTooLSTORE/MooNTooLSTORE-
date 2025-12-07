'use client';

import React, { useRef, useEffect } from 'react';

type PlexusEffectProps = {
    pointCount?: number;
    speed?: number;
    maxDist?: number;
    triMaxDist?: number;
    showPoints?: boolean;
    alwaysConnectLines?: boolean;
    minDistance?: number;
};

const PlexusEffect: React.FC<PlexusEffectProps> = ({ pointCount = 150, speed = 1, maxDist = 180, triMaxDist = 220, showPoints = true, alwaysConnectLines = false, minDistance = 0 }) => {
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

        const redColor = '176, 48, 96';
        const blueColor = '62, 138, 238';

        let points: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];

        const initPoints = () => {
            points = [];
            for (let i = 0; i < pointCount; i++) {
                points.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() * 0.3 - 0.15) * speed,
                    vy: (Math.random() * 0.3 - 0.15) * speed,
                    radius: Math.random() * 2 + 1.5 
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Repulsion logic
            if (minDistance > 0) {
                for (let i = 0; i < points.length; i++) {
                    for (let j = i + 1; j < points.length; j++) {
                        const p1 = points[i];
                        const p2 = points[j];
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const dist = Math.hypot(dx, dy);

                        if (dist < minDistance) {
                            const force = (minDistance - dist) / minDistance;
                            const forceX = (dx / dist) * force * 0.1;
                            const forceY = (dy / dist) * force * 0.1;
                            p1.vx -= forceX;
                            p1.vy -= forceY;
                            p2.vx += forceX;
                            p2.vy += forceY;
                        }
                    }
                }
            }


            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                
                const color = p1.x < canvas.width / 2 ? redColor : blueColor;

                p1.x += p1.vx;
                p1.y += p1.vy;

                if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
                if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;
                
                if (showPoints) {
                    ctx.beginPath();
                    ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${color}, 0.9)`;
                    ctx.fill();
                }

                if (alwaysConnectLines) {
                    // Find 3 nearest neighbors and connect to them
                    const neighbors = points
                        .map((p, index) => ({ point: p, index, dist: Math.hypot(p1.x - p.x, p1.y - p.y) }))
                        .filter(p => p.index !== i) // Exclude self
                        .sort((a, b) => a.dist - b.dist)
                        .slice(0, 3);

                    for (const neighbor of neighbors) {
                        const p2 = neighbor.point;
                        
                        // To avoid drawing lines twice, only draw if p1's index is less than p2's
                        if (i < neighbor.index) {
                            const p2_color = p2.x < canvas.width / 2 ? redColor : blueColor;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            
                            let strokeStyle;
                            if (color !== p2_color) {
                                const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                                gradient.addColorStop(0, `rgba(${color}, 0.5)`);
                                gradient.addColorStop(1, `rgba(${p2_color}, 0.5)`);
                                strokeStyle = gradient;
                            } else {
                                strokeStyle = `rgba(${color}, 0.5)`;
                            }
                            ctx.strokeStyle = strokeStyle;
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    }
                }

                for (let j = i + 1; j < points.length; j++) {
                    const p2 = points[j];
                    const dist_p1_p2 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    
                    const p2_color = p2.x < canvas.width / 2 ? redColor : blueColor;
                    
                    const currentMaxDist = maxDist === 0 ? 180 : maxDist;

                    if (!alwaysConnectLines && dist_p1_p2 < currentMaxDist) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        
                        let strokeStyle;
                         if (color !== p2_color) {
                            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                            gradient.addColorStop(0, `rgba(${color}, 0.5)`);
                            gradient.addColorStop(1, `rgba(${p2_color}, 0.5)`);
                            strokeStyle = gradient;
                        } else {
                            strokeStyle = `rgba(${color}, 0.5)`;
                        }
                        ctx.strokeStyle = strokeStyle;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                    
                    const currentTriMaxDist = triMaxDist === 0 ? 220 : triMaxDist;

                    for (let k = j + 1; k < points.length; k++) {
                        const p3 = points[k];
                        const dist_p1_p3 = Math.hypot(p1.x - p3.x, p1.y - p3.y);
                        const dist_p2_p3 = Math.hypot(p2.x - p3.x, p2.y - p3.y);

                        if (dist_p1_p2 < currentTriMaxDist && dist_p1_p3 < currentTriMaxDist && dist_p2_p3 < currentTriMaxDist) {
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.lineTo(p3.x, p3.y);
                            ctx.closePath();
                            
                            const averageDist = (dist_p1_p2 + dist_p1_p3 + dist_p2_p3) / 3;
                            const opacity = 0.6 * (1 - averageDist / currentTriMaxDist);

                            let fillStyle;
                            const all_red = p1.x < canvas.width/2 && p2.x < canvas.width/2 && p3.x < canvas.width/2;
                            const all_blue = p1.x > canvas.width/2 && p2.x > canvas.width/2 && p3.x > canvas.width/2;

                            if (all_red) {
                                fillStyle = `rgba(${redColor}, ${opacity})`;
                            } else if (all_blue) {
                                fillStyle = `rgba(${blueColor}, ${opacity})`;
                            } else {
                                const gradient = ctx.createLinearGradient(Math.min(p1.x,p2.x,p3.x), 0, Math.max(p1.x,p2.x,p3.x), 0);
                                gradient.addColorStop(0, `rgba(${redColor}, ${opacity})`);
                                gradient.addColorStop(1, `rgba(${blueColor}, ${opacity})`);
                                fillStyle = gradient;
                            }
                            
                            ctx.fillStyle = fillStyle;
                            ctx.fill();
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        
        resizeCanvas();
        initPoints();
        animate();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [pointCount, speed, maxDist, triMaxDist, showPoints, alwaysConnectLines, minDistance]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

export default PlexusEffect;
