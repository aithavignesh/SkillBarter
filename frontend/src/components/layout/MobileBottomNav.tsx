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
    <div className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pt-1.5 px-3 flex items-center justify-around shadow-lg">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isProfileRoute = item.label === 'Profile' && location.pathname.startsWith('/profile/');
        const isActive = isProfileRoute || location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        return <Link key={item.path} to={item.path} aria-current={isActive ? 'page' : undefined} className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 py-1 text-[10px] font-medium transition-colors focus-visible:z-10 ${isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}><div className="relative"><Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} /></div><span className="mt-0.5 min-w-0 break-words text-center">{item.label}</span></Link>;
      })}
      <ProductNavigationMobile />
    </div>
  );
};
