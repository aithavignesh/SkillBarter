import React from 'react';

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex border-b border-white/[0.08] gap-6 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              isActive
                ? 'text-violet-300'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'bg-white/[0.06] text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-full shadow-[0_0_12px_rgba(167,139,250,0.55)]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
