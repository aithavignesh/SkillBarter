import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, ShieldCheck, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-cinematic border-t border-[#26324b] py-12 text-xs">
      <div className="footer-cinematic__content mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="mb-2 flex items-center gap-2 font-bold text-lg text-white">
              <div className="flex h-8 w-8 items-center justify-center bg-[#d31d24] text-white">
                <Repeat className="w-4 h-4" />
              </div>
              <span>SkillBarter</span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-[#c3c9d3]">
              "Your Skills. Your Community. Your Currency."
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e3a1a4]">
              <ShieldCheck className="h-4 w-4" /> Zero cash exchange platform
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/discover" className="footer-cinematic__link">Discover Skills</Link></li>
              <li><Link to="/matches" className="footer-cinematic__link">Reciprocal Matching</Link></li>
              <li><Link to="/trust" className="footer-cinematic__link">Trust & Reputation</Link></li>
              <li><Link to="/community" className="footer-cinematic__link">Neighborhood Stats</Link></li>
            </ul>
          </div>

          {/* Core Philosophy */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Hyperlocal Barter</h4>
            <p className="text-[11px] leading-relaxed text-[#c3c9d3]">
              Connecting verified neighbors within 2 to 25 km to exchange knowledge, repair work, tutoring, and services. No currency, transaction fees, or payment processing.
            </p>
          </div>

          {/* Community Safety */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Safety & Trust</h4>
            <p className="mb-2 text-[11px] leading-relaxed text-[#c3c9d3]">
              All exchanges are governed by dynamic algorithmic trust scoring based on completion reliability, mutual reviews, and verified identity.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#e1e5eb]">
              <MapPin className="h-3.5 w-3.5 text-[#e3a1a4]" /> Privacy-first approximate geo-fencing
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-8 text-[11px] text-[#aeb8c8] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} SkillBarter, Inc. Built for hyper-local neighbor cooperation.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-3 w-3 fill-[#d31d24] text-[#d31d24]" /> for strong local communities.
          </p>
        </div>
      </div>
    </footer>
  );
};
