import React from 'react';
import { BadgeCheck } from 'lucide-react';
import {
  FacebookIcon,
  MastercardIcon,
  OrangeMoneyTile,
  TikTokIcon,
  VisaWordmark,
  WaveTile,
} from './BrandIcons';

/** White Juula cart mark (from the favicon), for the central tile. */
const JuulaMark: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="60 40 230 270" className={className} fill="#FFFFFF" aria-hidden="true">
    <path d="m156.72,283.91c-.07,7.68-6.31,13.88-13.93,13.85-7.45-.04-13.67-6.43-13.61-14,.07-7.45,6.4-13.48,14.1-13.41,7.3.05,13.51,6.31,13.44,13.56Z" />
    <path d="m205.56,283.91c-.07,7.68-6.31,13.88-13.93,13.85-7.45-.04-13.67-6.43-13.61-14,.07-7.45,6.4-13.48,14.1-13.41,7.3.05,13.51,6.31,13.44,13.56Z" />
    <path d="m245.46,57.61c20.66,27.63,26.13,58.18,15.99,91.05-12.36,40.13-47.09,67.41-89.01,69.85-29.99,1.73-56-8.17-77.45-29.41-3.53-3.49-6.79-7.36-9.52-11.5-4.85-7.36-3.48-14.72,3.07-19.61,6.28-4.69,14.21-3.72,19.8,2.74,5.79,6.68,11.82,13.09,19.5,17.58,25.3,14.75,50.88,15.47,76.14.26,28.25-17.05,40.72-55.03,28.58-85.34-.25-.65-.51-1.31-.83-1.92-1.51-2.76-2.68-3.1-5.21-1.22-3.78,2.78-7.37,5.83-11.25,8.47-2.19,1.48-4.7,2.78-7.26,3.4-6.45,1.57-12.67-1.86-15.98-8.37-2.75-5.43-1.54-12.15,3.47-16.31,5.08-4.2,10.49-8.01,15.75-11.99l-.06-.08c4.7-3.56,9.34-7.21,14.12-10.66,7.39-5.31,14.65-4.3,20.14,3.04Z" />
    <path d="m167.38,264.54c-23.65,0-43.88-5.02-59.55-10.98-9.53-3.62-13.83-14.68-9.14-23.74l.33-.64c4-7.71,13.14-11.08,21.27-8,12.41,4.7,28.4,8.66,47.09,8.66h.19c18.63-.03,34.57-3.99,46.94-8.68,8.1-3.07,17.21.28,21.19,7.97l.36.7c4.69,9.05.4,20.12-9.12,23.74-18.9,7.19-39.09,10.95-59.32,10.98h-.24Z" />
  </svg>
);

// Node positions in a 1000 × 340 coordinate space (the SVG lines use the
// same space; tiles are placed with the matching percentages).
const W = 1000;
const H = 340;
const C = { x: 500, y: 170 };
type Node = { x: number; y: number; float?: string; el: React.ReactNode };

const NODES: Node[] = [
  {
    x: 120,
    y: 175,
    float: 'motion-safe:animate-[float_7s_ease-in-out_infinite]',
    el: (
      <div className="w-48 p-3 rounded-2xl bg-white border border-[#ECEFF4] shadow-[0_18px_40px_-22px_rgba(32,29,29,0.4)]">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-[#ECFDF3] text-[#16A34A] flex items-center justify-center">
            <BadgeCheck className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#201D1D]">Nouvelle commande</p>
            <p className="text-[11px] text-[#7A808C]">32 000 F · payée par Wave</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    x: 290,
    y: 70,
    float: 'motion-safe:animate-[float_6s_ease-in-out_infinite]',
    el: (
      <Tile>
        <WaveTile />
      </Tile>
    ),
  },
  {
    x: 300,
    y: 270,
    float: 'motion-safe:animate-[float_8s_ease-in-out_infinite_1s]',
    el: (
      <Tile>
        <FacebookIcon className="w-9 h-9" />
      </Tile>
    ),
  },
  {
    x: 705,
    y: 75,
    float: 'motion-safe:animate-[float_7s_ease-in-out_infinite_.5s]',
    el: (
      <Tile>
        <OrangeMoneyTile />
      </Tile>
    ),
  },
  {
    x: 880,
    y: 170,
    float: 'motion-safe:animate-[float_6.5s_ease-in-out_infinite]',
    el: (
      <div className="w-40 h-24 rounded-2xl p-3 bg-gradient-to-br from-[#201D1D] to-[#3A3F4B] text-white shadow-[0_18px_40px_-20px_rgba(32,29,29,0.6)] flex flex-col justify-between">
        <span className="w-7 h-5 rounded-md bg-gradient-to-br from-[#F5D57A] to-[#C9A23F]" />
        <div className="flex items-end justify-between">
          <span className="text-[10px] tracking-[0.2em] text-white/70">•••• 4242</span>
          <span className="flex items-center gap-1">
            <VisaWordmark className="!text-white text-sm" />
            <MastercardIcon className="w-7 h-5" />
          </span>
        </div>
      </div>
    ),
  },
  {
    x: 720,
    y: 275,
    float: 'motion-safe:animate-[float_8s_ease-in-out_infinite_.8s]',
    el: (
      <Tile>
        <TikTokIcon className="w-8 h-8" />
      </Tile>
    ),
  },
];

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[72px] h-[72px] rounded-[22px] bg-white border border-[#ECEFF4] shadow-[0_18px_36px_-20px_rgba(32,29,29,0.35)] flex items-center justify-center">
      {children}
    </div>
  );
}

/** Elbow line from a node to the centre tile, with a junction dot. */
function linkPath(n: Node): { d: string; dot: { x: number; y: number } } {
  const left = n.x < C.x;
  const elbowX = left ? Math.max(n.x + 70, 380) : Math.min(n.x - 70, 620);
  const joinX = left ? 420 : 580;
  return {
    d: `M ${n.x} ${n.y} L ${elbowX} ${n.y} L ${joinX} ${C.y} L ${C.x} ${C.y}`,
    dot: { x: elbowX, y: n.y },
  };
}

export const HeroNetwork: React.FC = () => (
  <div className="relative w-full max-w-5xl mx-auto h-[340px]" aria-hidden="true">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      {NODES.map((n, i) => {
        const { d, dot } = linkPath(n);
        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="#D9DEE7"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={dot.x} cy={dot.y} r="4" fill="#235BF7" vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>

    {NODES.map((n, i) => (
      <div
        key={i}
        className={`absolute -translate-x-1/2 -translate-y-1/2 ${n.float ?? ''}`}
        style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
      >
        {n.el}
      </div>
    ))}

    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-[38px] bg-gradient-to-br from-[#4D7DFF] to-[#1F4FE0] flex items-center justify-center shadow-[0_30px_60px_-24px_rgba(35,91,247,0.75),inset_0_2px_0_rgba(255,255,255,0.35)]"
      style={{ left: '50%', top: `${(C.y / H) * 100}%` }}
    >
      <div className="w-24 h-24 rounded-full border-[3px] border-white/85 flex items-center justify-center">
        <JuulaMark className="w-14 h-14" />
      </div>
    </div>
  </div>
);
