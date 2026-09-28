import React from 'react';

interface TabItem { id: string; label: string; count?: number; }
interface TabsProps { tabs: TabItem[]; activeTab: string; onChange: (tabId: string) => void; className?: string; variant?: 'default' | 'network' | 'status'; }

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '', variant = 'default' }) => (
  <div role="group" aria-label="Sections" className={`flex border-b border-[#e1e5ea] ${variant === 'network' ? 'min-w-0 gap-2 overflow-x-auto overscroll-x-contain sm:gap-4' : variant === 'status' ? 'min-w-0 gap-1 overflow-x-auto overscroll-x-contain sm:gap-2' : 'gap-6 overflow-x-auto'} ${className}`}>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(tab.id)}
          className={variant === 'status'
            ? `relative flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition-colors duration-200 motion-reduce:transition-none focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#d31d24] sm:px-4 sm:text-sm ${isActive ? 'border-[#d31d24] text-[#d31d24]' : 'border-transparent text-[#66738a] hover:bg-[#f7f8f7] hover:text-[#17233b]'}`
            : variant === 'network'
            ? `relative flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-xs font-semibold transition-colors duration-200 motion-reduce:transition-none focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#d31d24] sm:text-sm ${isActive ? 'border-[#d31d24] text-[#d31d24]' : 'border-transparent text-[#66738a] hover:border-[#e1e4e8] hover:text-[#17233b]'}`
            : `relative flex items-center gap-2 whitespace-nowrap pb-3 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24] ${isActive ? 'text-[#d31d24]' : 'text-[#66738a] hover:text-[#17233b]'}`}
        >
          <span>{tab.label}</span>
          {tab.count !== undefined && <span className={variant === 'status'
            ? `inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-medium leading-none ${isActive ? 'bg-[#fff1f1] text-[#bd252b]' : 'bg-[#f2f4f7] text-[#7b8799]'}`
            : variant === 'network'
            ? `inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-4 ${isActive ? 'bg-[#fff1f1] text-[#d31d24]' : 'bg-[#f2f4f7] text-[#7b8799]'}`
            : `rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-[#fff1f1] text-[#d31d24]' : 'bg-[#f2f4f7] text-[#7b8799]'}`}>{tab.count}</span>}
          {(variant === 'default' || variant === 'status') && isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#d31d24]" />}
        </button>
      );
    })}
  </div>
);
