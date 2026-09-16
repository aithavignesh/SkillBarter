import React from 'react';

interface TabItem { id: string; label: string; count?: number; }
interface TabsProps { tabs: TabItem[]; activeTab: string; onChange: (tabId: string) => void; className?: string; }

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => (
  <div className={`flex border-b border-[#e1e5ea] gap-6 overflow-x-auto ${className}`}>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${isActive ? 'text-[#d31d24]' : 'text-[#66738a] hover:text-[#17233b]'}`}>
          {tab.label}
          {tab.count !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-[#fff1f1] text-[#d31d24]' : 'bg-[#f2f4f7] text-[#7b8799]'}`}>{tab.count}</span>}
          {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d31d24] rounded-full" />}
        </button>
      );
    })}
  </div>
);
