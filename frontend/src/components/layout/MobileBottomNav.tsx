import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Repeat, Compass, Sparkles, ArrowLeftRight, User as UserIcon } from 'lucide-react';
import { ProductNavigationMobile } from './ProductNavigation';

export const MobileBottomNav: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  const primaryItems = [
    { label: 'Feed', path: '/feed', icon: Repeat },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Matches', path: '/matches', icon: Sparkles },
    { label: 'Exchanges', path: '/exchanges', icon: ArrowLeftRight },
    { label: 'Profile', path: `/profile/${currentUser.id}`, icon: UserIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex items-center justify-around shadow-lg">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return <Link key={item.path} to={item.path} className={`flex flex-1 flex-col items-center py-1 px-1 rounded-lg text-[10px] font-medium transition-colors relative ${isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}><div className="relative"><Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} /></div><span className="mt-0.5">{item.label}</span></Link>;
      })}
      <ProductNavigationMobile />
    </div>
  );
};
