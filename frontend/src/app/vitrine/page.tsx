'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { ImmersiveShowcase } from '@/components/showcase/ImmersiveShowcase';
import { defaultFunnelConfig } from '@/data/mockData';
import { FunnelPageConfig } from '@/types/juula';

export default function VitrineStandalonePage() {
  const [config] = useState<FunnelPageConfig>(defaultFunnelConfig);
  const [deviceMode, setDeviceMode] = useState<'responsive' | 'mobile'>('responsive');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Banner with Navigation & Device Switcher */}
      <div className="w-full bg-[#0F172A] text-white py-2.5 px-4 sm:px-8 flex items-center justify-between text-xs sticky top-0 z-50 shadow-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-bold hover:text-white/80 transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard Marchand</span>
        </Link>

        {/* Mode Switcher : Plein Écran Responsive vs Simulateur Mobile */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
          <button
            onClick={() => setDeviceMode('responsive')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
              deviceMode === 'responsive'
                ? 'bg-[#1E60F8] text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plein Écran (PC / Responsive)</span>
            <span className="sm:hidden">PC</span>
          </button>

          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
              deviceMode === 'mobile'
                ? 'bg-[#1E60F8] text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulateur Mobile</span>
            <span className="sm:hidden">Mobile</span>
          </button>
        </div>

        <span className="hidden md:flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Boutique En Ligne Active
        </span>
      </div>

      {/* Main View Area */}
      <main className="flex-1 flex items-center justify-center p-0">
        {deviceMode === 'mobile' ? (
          <div className="py-6 px-4 w-full flex justify-center bg-slate-950 min-h-[calc(100vh-50px)]">
            <div className="w-[390px] max-w-full h-[820px] max-h-[calc(100vh-80px)] bg-[#F8FAFC] rounded-[3.2rem] border-[10px] border-neutral-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden relative flex flex-col ring-1 ring-white/10">
              {/* Dynamic Island Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-end pr-2 pointer-events-none shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700" />
              </div>

              {/* Scrollable Screen Content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <ImmersiveShowcase config={config} isInsideMockup={true} />
              </div>

              {/* Home indicator bar */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/40 rounded-full z-50 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="w-full">
            <ImmersiveShowcase config={config} isInsideMockup={false} />
          </div>
        )}
      </main>
    </div>
  );
}
