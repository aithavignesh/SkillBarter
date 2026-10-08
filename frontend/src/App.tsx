import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Footer } from './components/layout/Footer';
import { PlatformEnhancements } from './components/features/PlatformEnhancements';
import { ProfessionalLayer } from './components/features/ProfessionalLayer';

const LandingPage = React.lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ResetPasswordPage = React.lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const SignupPage = React.lazy(() =>
  import('./pages/SignupPage').then((m) => ({ default: m.SignupPage }))
);
const OnboardingPage = React.lazy(() =>
  import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const FeedPage = React.lazy(() =>
  import('./pages/FeedPage').then((m) => ({ default: m.FeedPage }))
);
const DiscoverPage = React.lazy(() =>
  import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage }))
);
const SkillMatchesPage = React.lazy(() =>
  import('./pages/SkillMatchesPage').then((m) => ({ default: m.SkillMatchesPage }))
);
const InvitePeersPage = React.lazy(() =>
  import('./pages/InvitePeersPage').then((m) => ({ default: m.InvitePeersPage }))
);
const BetaFeedbackPage = React.lazy(() =>
  import('./pages/BetaFeedbackPage').then((m) => ({ default: m.BetaFeedbackPage }))
);
const ExchangesPage = React.lazy(() =>
  import('./pages/ExchangesPage').then((m) => ({ default: m.ExchangesPage }))
);
const ExchangeWorkspacePage = React.lazy(() =>
  import('./pages/ExchangeWorkspacePage').then((m) => ({ default: m.ExchangeWorkspacePage }))
);
const MessagesPage = React.lazy(() =>
  import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage }))
);
const ConversationPage = React.lazy(() =>
  import('./pages/ConversationPage').then((m) => ({ default: m.ConversationPage }))
);
const LinkedInStyleProfilePage = React.lazy(() =>
  import('./pages/LinkedInStyleProfilePage').then((m) => ({
    default: m.LinkedInStyleProfilePage,
  }))
);
const NotificationsPage = React.lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const TrustSystemPage = React.lazy(() =>
  import('./pages/TrustSystemPage').then((m) => ({ default: m.TrustSystemPage }))
);
const ConnectionsPage = React.lazy(() =>
  import('./pages/ConnectionsPage').then((m) => ({ default: m.ConnectionsPage }))
);
const CommunityPage = React.lazy(() =>
  import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage }))
);
const AdminDashboardPage = React.lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const MonetizationPage = React.lazy(() =>
  import('./pages/MonetizationPage').then((m) => ({ default: m.MonetizationPage }))
);
const AdditionalScreen = React.lazy(() =>
  import('./pages/FunctionalAdditionalScreensPage2').then((m) => ({
    default: m.AdditionalScreen,
  }))
);
const WorkshopScreensPage = React.lazy(() =>
  import('./pages/WorkshopScreensPage').then((m) => ({
    default: m.WorkshopScreensPage,
  }))
);

import './services/enableMonetizationPersistence';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
}> = ({ children, allowIncompleteOnboarding = false }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">
        Authenticating community member...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (
    !allowIncompleteOnboarding &&
    currentUser.onboarding_completed === false &&
    location.pathname !== '/onboarding'
  ) {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
};

const profileScreenIds = new Set([
  'edit-profile',
  'public-profile',
  'skills',
  'add-skill',
]);

const exchangeScreenIds = new Set([
  'active-exchange',
  'exchange-history',
  'exchange-rating',
  'schedule',
  'calendar',
]);

const ProfileIntegratedRoute: React.FC = () => {
  const { id = '' } = useParams();

  return profileScreenIds.has(id) ? (
    <AdditionalScreen />
  ) : (
    <LinkedInStyleProfilePage />
  );
};

const ExchangeIntegratedRoute: React.FC = () => {
  const { id = '' } = useParams();

  return exchangeScreenIds.has(id) ? (
    <AdditionalScreen />
  ) : (
    <ExchangeWorkspacePage />
  );
};

const legacyScreenPaths: Record<string, string> = {
  dashboard: '/home/dashboard',
  'edit-profile': '/profile/edit-profile',
  'public-profile': '/profile/public-profile',
  skills: '/profile/skills',
  'add-skill': '/profile/add-skill',
  'learning-goals': '/learning/learning-goals',
  'teaching-skills': '/learning/teaching-skills',
  search: '/discover/search',
  'advanced-search': '/discover/advanced-search',
  recommended: '/discover/recommended',
  'ai-matching': '/matches/ai-matching',
  'match-details': '/matches/match-details',
  'send-request': '/requests/send-request',
  'incoming-requests': '/requests/incoming-requests',
  'sent-requests': '/requests/sent-requests',
  'request-details': '/requests/request-details',
  'active-exchange': '/exchanges/active-exchange',
  'exchange-history': '/exchanges/exchange-history',
  'exchange-rating': '/exchanges/exchange-rating',
  schedule: '/exchanges/schedule',
  calendar: '/exchanges/calendar',
  notifications: '/notifications',
  'notification-settings': '/notifications/notification-settings',
  'chat-details': '/messages/chat-details',
  'create-post': '/community/create-post',
  'post-details': '/community/post-details',
  groups: '/community/groups',
  'group-details': '/community/group-details',
  workshops: '/workshops/workshops',
  'create-workshop': '/workshops/create-workshop',
  'workshop-details': '/workshops/workshop-details',
  'my-workshops': '/workshops/my-workshops',
  credits: '/learning/credits',
  premium: '/membership/premium',
  verification: '/trust/verification',
  support: '/support/support',
  faq: '/support/faq',
  privacy: '/settings/privacy',
  'account-settings': '/settings/account-settings',
  activity: '/activity/activity',
};

const LegacyScreenRedirect: React.FC = () => {
  const { id = '' } = useParams();

  return <Navigate to={legacyScreenPaths[id] || '/feed'} replace />;
};

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-400">
    Loading...
  </div>
);

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const isChat =
    location.pathname.startsWith('/messages') ||
    location.pathname.includes('/exchanges/');

  const appClass = currentUser ? 'lg:ml-[312px]' : '';

  return (
    <div className="ricoz-theme min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main
        className={`min-h-[calc(100vh-72px)] pb-16 md:pb-0 ${appClass}`}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                currentUser ? (
                  <Navigate to="/feed" replace />
                ) : (
                  <LandingPage />
                )
              }
            />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowIncompleteOnboarding>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <FeedPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <DiscoverPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <SkillMatchesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/invite"
              element={
                <ProtectedRoute>
                  <InvitePeersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <BetaFeedbackPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/exchanges"
              element={
                <ProtectedRoute>
                  <ExchangesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/exchanges/:id"
              element={
                <ProtectedRoute>
                  <ExchangeIntegratedRoute />
                </ProtectedRoute>
              }
            />

            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/messages/:id"
              element={
                <ProtectedRoute>
                  <ConversationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile/:id"
              element={
                <ProtectedRoute>
                  <ProfileIntegratedRoute />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trust"
              element={
                <ProtectedRoute>
                  <TrustSystemPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trust/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/connections"
              element={
                <ProtectedRoute>
                  <ConnectionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <CommunityPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/monetization"
              element={
                <ProtectedRoute>
                  <MonetizationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workshops/:id"
              element={
                <ProtectedRoute>
                  <WorkshopScreensPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/home/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learning/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/discover/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/matches/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/requests/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/membership/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/support/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/activity/:id"
              element={
                <ProtectedRoute>
                  <AdditionalScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/screens/:id"
              element={<LegacyScreenRedirect />}
            />

            <Route
              path="/screens"
              element={<Navigate to="/feed" replace />}
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </Suspense>

        {currentUser && (
          <>
            <PlatformEnhancements />
            <ProfessionalLayer />
          </>
        )}
      </main>

      <div className={appClass}>{!isChat && <Footer />}</div>

      <MobileBottomNav />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;