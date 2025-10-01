"use client";
import { useEffect, useRef } from "react";

type RadarPoint = { axis: string; score: number };
export default function RadarPanel({ data }: { data: RadarPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0,0,W,H);

    const cx=W/2, cy=H/2, r=Math.min(W,H)*0.38;
    const n = Math.max(3, data.length);

    // axes
    ctx.strokeStyle="#e5e7eb"; ctx.lineWidth=1;
    for (let i=0;i<n;i++){
      const ang = -Math.PI/2 + i*2*Math.PI/n;
      const x = cx + r*Math.cos(ang), y = cy + r*Math.sin(ang);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
    }

    // polygon levels
    for (let k=1;k<=4;k++){
      const rr = (r*k)/4;
      ctx.beginPath();
      for (let i=0;i<n;i++){
        const ang=-Math.PI/2 + i*2*Math.PI/n;
        const x=cx+rr*Math.cos(ang), y=cy+rr*Math.sin(ang);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath(); ctx.stroke();
    }

    // value polygon
    ctx.fillStyle="rgba(99,102,241,0.25)";
    ctx.strokeStyle="rgba(99,102,241,0.9)"; ctx.lineWidth=2;
    ctx.beginPath();
    data.forEach((p,i)=>{
      const ang=-Math.PI/2 + i*2*Math.PI/n;
      const rr = r*(Math.max(0, Math.min(100, p.score))/100);
      const x=cx+rr*Math.cos(ang), y=cy+rr*Math.sin(ang);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // labels
    ctx.fillStyle="#6b7280"; ctx.font="12px sans-serif"; ctx.textAlign="center";
    data.forEach((p,i)=>{
      const ang=-Math.PI/2 + i*2*Math.PI/n;
      const x=cx+(r+16)*Math.cos(ang), y=cy+(r+16)*Math.sin(ang);
      ctx.fillText(p.axis, x, y);
    });
  }, [data]);

  return <canvas ref={canvasRef} width={380} height={280} className="w-full h-[220px]" />;
}
