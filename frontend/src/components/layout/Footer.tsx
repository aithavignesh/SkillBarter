import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, ShieldCheck, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Repeat className="w-4 h-4" />
              </div>
              <span>SkillBarter</span>
            </div>
            <p className="text-slate-400 mb-3 leading-relaxed text-[11px]">
              "Your Skills. Your Community. Your Currency."
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4" /> Zero cash exchange platform
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs tracking-wider uppercase">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/discover" className="hover:text-emerald-400 transition-colors">Discover Skills</Link></li>
              <li><Link to="/matches" className="hover:text-emerald-400 transition-colors">Reciprocal Matching</Link></li>
              <li><Link to="/trust" className="hover:text-emerald-400 transition-colors">Trust & Reputation</Link></li>
              <li><Link to="/community" className="hover:text-emerald-400 transition-colors">Neighborhood Stats</Link></li>
            </ul>
          </div>

          {/* Core Philosophy */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs tracking-wider uppercase">Hyperlocal Barter</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Connecting verified neighbors within 2 to 25 km to exchange knowledge, repair work, tutoring, and services. No currency, transaction fees, or payment processing.
            </p>
          </div>

          {/* Community Safety */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs tracking-wider uppercase">Safety & Trust</h4>
            <p className="text-slate-400 leading-relaxed text-[11px] mb-2">
              All exchanges are governed by dynamic algorithmic trust scoring based on completion reliability, mutual reviews, and verified identity.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Privacy-first approximate geo-fencing
            </span>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} SkillBarter, Inc. Built for hyper-local neighbor cooperation.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for strong local communities.
          </p>
        </div>
      </div>
    </footer>
  );
};
