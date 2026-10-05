'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ImmersiveShowcase } from '@/components/showcase/ImmersiveShowcase';
import { defaultFunnelConfig } from '@/data/mockData';
import { FunnelPageConfig } from '@/types/juula';

export default function VitrineStandalonePage() {
  const [config] = useState<FunnelPageConfig>(defaultFunnelConfig);

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <ImmersiveShowcase config={config} isInsideMockup={false} />

      {/* Return button: small, in the empty left slot of the store header */}
      <Link
        href="/dashboard"
        aria-label="Retour au tableau de bord"
        className="fixed top-3 sm:top-4 left-3 sm:left-6 z-50 inline-flex items-center justify-center gap-2 w-10 sm:w-auto sm:px-4 h-10 rounded-full bg-white border border-[#E3E7EE] text-[#201D1D] text-[14px] font-semibold hover:bg-[#F6F7F9] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[#235BF7]" />
        <span className="hidden sm:inline">Retour au tableau de bord</span>
      </Link>
    </div>
  );
}
