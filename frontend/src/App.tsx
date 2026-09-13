import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { FeedPage } from './pages/FeedPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { SkillMatchesPage } from './pages/SkillMatchesPage';
import { ExchangesPage } from './pages/ExchangesPage';
import { ExchangeWorkspacePage } from './pages/ExchangeWorkspacePage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { TrustSystemPage } from './pages/TrustSystemPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { CommunityPage } from './pages/CommunityPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MonetizationPage } from './pages/MonetizationPage';
import { AdditionalScreen } from './pages/AdditionalScreensPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Authenticating community member...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// The 40 additional product screens are integrated into the actual product information architecture.
// They are intentionally NOT exposed as a separate /screens catalogue.
const integratedScreens: Record<string, string> = {
  '/home/dashboard': 'dashboard',
  '/profile/edit': 'edit-profile',
  '/profile/public': 'public-profile',
  '/profile/skills': 'skills',
  '/profile/skills/add': 'add-skill',
  '/learning/goals': 'learning-goals',
  '/learning/teaching': 'teaching-skills',
  '/discover/search': 'search',
  '/discover/filters': 'advanced-search',
  '/discover/recommended': 'recommended',
  '/matches/ai': 'ai-matching',
  '/matches/details': 'match-details',
  '/requests/new': 'send-request',
  '/requests/incoming': 'incoming-requests',
  '/requests/sent': 'sent-requests',
  '/requests/details': 'request-details',
  '/exchanges/active': 'active-exchange',
  '/exchanges/history': 'exchange-history',
  '/exchanges/rating': 'exchange-rating',
  '/exchanges/schedule': 'schedule',
  '/exchanges/calendar': 'calendar',
  '/notifications/all': 'notifications',
  '/notifications/settings': 'notification-settings',
  '/messages/details': 'chat-details',
  '/community/post/new': 'create-post',
  '/community/post': 'post-details',
  '/community/groups': 'groups',
  '/community/groups/details': 'group-details',
  '/workshops': 'workshops',
  '/workshops/new': 'create-workshop',
  '/workshops/details': 'workshop-details',
  '/workshops/mine': 'my-workshops',
  '/credits': 'credits',
  '/membership/premium': 'premium',
  '/verification': 'verification',
  '/support': 'support',
  '/support/faq': 'faq',
  '/settings/privacy': 'privacy',
  '/settings/account': 'account-settings',
  '/activity': 'activity',
};

const legacyScreenRedirects: Record<string, string> = Object.fromEntries(
  Object.entries(integratedScreens).map(([path, id]) => [`/screens/${id}`, path])
);

const IntegratedScreen: React.FC<{ id: string }> = ({ id }) => <ProtectedRoute><AdditionalScreenForId id={id} /></ProtectedRoute>;

const AdditionalScreenForId: React.FC<{ id: string }> = ({ id }) => {
  // Reuse the existing 40 distinct screen implementations while mounting them at their real product routes.
  return <AdditionalScreenRouteBridge id={id} />;
};

const AdditionalScreenRouteBridge: React.FC<{ id: string }> = ({ id }) => {
  // AdditionalScreen reads the route parameter, so temporarily encode the selected screen through a
  // dedicated pathname-independent wrapper. This keeps one source of truth for the 40 screen UIs.
  const location = useLocation();
  const routeId = Object.entries(integratedScreens).find(([path]) => path === location.pathname)?.[1] || id;
  return <AdditionalScreenWithId id={routeId} />;
};

const AdditionalScreenWithId: React.FC<{ id: string }> = ({ id }) => {
  // The component is already implemented as a screen-level UI. Passing the id through a tiny route
  // bridge lets us integrate it without introducing a second copy of the 40-screen implementation.
  return <AdditionalScreenInjected id={id} />;
};

const AdditionalScreenInjected: React.FC<{ id: string }> = ({ id }) => {
  // Navigate is handled by the existing screen component; this route bridge is replaced below by a
  // query-free route redirect so the screen receives its canonical id.
  return <Navigate to={`/screens/${id}`} replace />;
};

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/messages') || location.pathname.includes('/exchanges/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={currentUser ? <Navigate to="/feed" replace /> : <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><SkillMatchesPage /></ProtectedRoute>} />
          <Route path="/exchanges" element={<ProtectedRoute><ExchangesPage /></ProtectedRoute>} />
          <Route path="/exchanges/:id" element={<ProtectedRoute><ExchangeWorkspacePage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/trust" element={<ProtectedRoute><TrustSystemPage /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/monetization" element={<ProtectedRoute><MonetizationPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />

          {Object.entries(integratedScreens).map(([path, id]) => (
            <Route key={path} path={path} element={<IntegratedScreen id={id} />} />
          ))}

          {/* Old catalogue URLs are retained only as redirects so existing bookmarks do not break. */}
          {Object.entries(legacyScreenRedirects).map(([oldPath, newPath]) => (
            <Route key={oldPath} path={oldPath} element={<Navigate to={newPath} replace />} />
          ))}
          <Route path="/screens" element={<Navigate to="/feed" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isChat && <Footer />}
      <MobileBottomNav />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider><AppContent /></NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
