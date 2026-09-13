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

// These are the 40 product screens mounted directly inside SkillBarter's information architecture.
// The final URL segment intentionally matches the existing screen id so the existing screen-level UI
// can be reused without maintaining a second copy of every screen.
const integratedScreenPaths = [
  '/home/dashboard',
  '/profile/edit-profile',
  '/profile/public-profile',
  '/profile/skills',
  '/profile/add-skill',
  '/learning/learning-goals',
  '/learning/teaching-skills',
  '/discover/search',
  '/discover/advanced-search',
  '/discover/recommended',
  '/matches/ai-matching',
  '/matches/match-details',
  '/requests/send-request',
  '/requests/incoming-requests',
  '/requests/sent-requests',
  '/requests/request-details',
  '/exchanges/active-exchange',
  '/exchanges/exchange-history',
  '/exchanges/exchange-rating',
  '/exchanges/schedule',
  '/exchanges/calendar',
  '/notifications/notifications',
  '/notifications/notification-settings',
  '/messages/chat-details',
  '/community/create-post',
  '/community/post-details',
  '/community/groups',
  '/community/group-details',
  '/workshops/workshops',
  '/workshops/create-workshop',
  '/workshops/workshop-details',
  '/workshops/my-workshops',
  '/learning/credits',
  '/membership/premium',
  '/trust/verification',
  '/support/support',
  '/support/faq',
  '/settings/privacy',
  '/settings/account-settings',
  '/activity/activity',
] as const;

const IntegratedScreenRoute: React.FC = () => <ProtectedRoute><AdditionalScreen /></ProtectedRoute>;

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

          {integratedScreenPaths.map((path) => (
            <Route key={path} path={path} element={<IntegratedScreenRoute />} />
          ))}

          {/* Old showcase links now resolve into the real product areas instead of opening a catalogue. */}
          <Route path="/screens" element={<Navigate to="/feed" replace />} />
          <Route path="/screens/:id" element={<Navigate to="/feed" replace />} />
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
