import React from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { LEGAL } from '@/lib/legal';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

/** Layout shared by /confidentialite and /conditions: numbered sections
 *  with a table of contents (sticky on desktop). */
export const LegalPage: React.FC<LegalPageProps> = ({ eyebrow, title, intro, sections }) => (
  <div className="min-h-screen bg-[#F2F4F7] text-[#0F172A]">
    <SiteHeader />
    <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      <div className="max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-wider text-[#1E60F8] bg-[#EFF4FF] px-2.5 py-1 rounded-md">
          {eyebrow}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-4">{title}</h1>
        <p className="text-sm text-[#64748B] mt-2">Dernière mise à jour : {LEGAL.lastUpdated}</p>
        <div className="text-[15px] leading-relaxed text-[#334155] mt-5 space-y-3">{intro}</div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr] items-start">
        <nav
          aria-label="Sommaire"
          className="hidden lg:block lg:sticky lg:top-24 p-5 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs max-h-[70vh] overflow-y-auto"
        >
          <p className="text-xs font-black uppercase tracking-wider text-[#0F172A] mb-3">
            Sommaire
          </p>
          <ol className="space-y-1.5 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex gap-2 text-[#475569] hover:text-[#1E60F8]">
                  <span className="font-mono text-xs text-[#94A3B8] pt-0.5 w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-4">
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs"
            >
              <h2 className="text-lg font-black tracking-tight flex gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#EFF4FF] text-[#1E60F8] text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s.title}</span>
              </h2>
              <div className="mt-3 text-[15px] leading-relaxed text-[#334155] space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-[#0F172A]">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
);
