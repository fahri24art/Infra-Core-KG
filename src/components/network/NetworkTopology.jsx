import React, { useEffect, useRef } from 'react';
import { Card } from '../ui/Card';

export default function NetworkTopology({ nodes, links, loading }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (loading) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("Scanning Topology...", canvas.width / 2, canvas.height / 2);
            return;
        }

        // Draw Links
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        links.forEach(link => {
            const start = nodes.find(n => n.id === link.from);
            const end = nodes.find(n => n.id === link.to);
            if (start && end) {
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        });

        // Draw Nodes
        nodes.forEach(node => {
            // Node Circle
            ctx.fillStyle = node.status === 'up' ? '#fff' : '#fee2e2';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI);
            ctx.fill();

            // Border
            ctx.strokeStyle = node.status === 'up' ? '#3b82f6' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Icon Text
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(node.type.toUpperCase().substring(0, 3), node.x, node.y + 4);

            // Label
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(node.label, node.x, node.y + 40);
        });

    }, [nodes, links, loading]);

    return (
        <Card className="overflow-hidden bg-slate-50 border border-slate-200 shadow-inner relative">
            <div className="absolute top-4 left-4 text-xs text-slate-400 bg-white/80 p-2 rounded backdrop-blur">
                Map updated: {new Date().toLocaleTimeString()}
            </div>
            <div className="flex justify-center p-5 overflow-auto">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={500}
                    className="bg-white rounded-xl shadow-sm border border-slate-100"
                />
            </div>
        </Card>
    );
}
