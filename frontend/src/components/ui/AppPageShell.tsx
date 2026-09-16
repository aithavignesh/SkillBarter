import React from 'react';
import { ChevronRight, Search } from 'lucide-react';

type AppPageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  children: React.ReactNode;
};

export const AppPageShell: React.FC<AppPageShellProps> = ({
  eyebrow,
  title,
  description,
  icon,
  actions,
  search,
  children,
}) => (
  <main className="min-h-[calc(100vh-1px)] bg-[#f7f7f5] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
    <div className="mx-auto w-full max-w-[1320px]">
      <div className="mb-5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        <span>Workspace</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-600">{title}</span>
      </div>

      <section className="border-b border-[#e1e4e8] pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">
                {icon}
                <span>{eyebrow}</span>
              </div>
            )}
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#17233b] sm:text-3xl">{title}</h1>
            {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#697386]">{description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <label className="relative block w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder || 'Search'}
                  className="h-10 w-full border border-[#d9dde2] bg-white pl-9 pr-3 text-xs text-[#17233b] outline-none transition focus:border-[#d31d24]"
                />
              </label>
            )}
            {actions}
          </div>
        </div>
      </section>

      <div className="pt-6">{children}</div>
    </div>
  </main>
);
