import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Footer } from './components/layout/Footer';
import { PlatformEnhancements } from './components/features/PlatformEnhancements';
import { ProfessionalLayer } from './components/features/ProfessionalLayer';
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
import { AdditionalScreen } from './pages/FunctionalAdditionalScreensPage2';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Authenticating community member...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const profileScreenIds = new Set(['edit-profile','public-profile','skills','add-skill']);
const exchangeScreenIds = new Set(['active-exchange','exchange-history','exchange-rating','schedule','calendar']);
const ProfileIntegratedRoute: React.FC = () => { const { id = '' } = useParams(); return profileScreenIds.has(id) ? <AdditionalScreen /> : <ProfilePage />; };
const ExchangeIntegratedRoute: React.FC = () => { const { id = '' } = useParams(); return exchangeScreenIds.has(id) ? <AdditionalScreen /> : <ExchangeWorkspacePage />; };
const legacyScreenPaths: Record<string, string> = { dashboard:'/home/dashboard','edit-profile':'/profile/edit-profile','public-profile':'/profile/public-profile',skills:'/profile/skills','add-skill':'/profile/add-skill','learning-goals':'/learning/learning-goals','teaching-skills':'/learning/teaching-skills',search:'/discover/search','advanced-search':'/discover/advanced-search',recommended:'/discover/recommended','ai-matching':'/matches/ai-matching','match-details':'/matches/match-details','send-request':'/requests/send-request','incoming-requests':'/requests/incoming-requests','sent-requests':'/requests/sent-requests','request-details':'/requests/request-details','active-exchange':'/exchanges/active-exchange','exchange-history':'/exchanges/exchange-history','exchange-rating':'/exchanges/exchange-rating',schedule:'/exchanges/schedule',calendar:'/exchanges/calendar',notifications:'/notifications/notifications','notification-settings':'/notifications/notification-settings','chat-details':'/messages/chat-details','create-post':'/community/create-post','post-details':'/community/post-details',groups:'/community/groups','group-details':'/community/group-details',workshops:'/workshops/workshops','create-workshop':'/workshops/create-workshop','workshop-details':'/workshops/workshop-details','my-workshops':'/workshops/my-workshops',credits:'/learning/credits',premium:'/membership/premium',verification:'/trust/verification',support:'/support/support',faq:'/support/faq',privacy:'/settings/privacy','account-settings':'/settings/account-settings',activity:'/activity/activity' };
const LegacyScreenRedirect: React.FC = () => { const { id = '' } = useParams(); return <Navigate to={legacyScreenPaths[id] || '/feed'} replace />; };

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/messages') || location.pathname.includes('/exchanges/');
  const appClass = currentUser ? 'lg:ml-[312px]' : '';
  return <div className="ricoz-theme min-h-screen bg-slate-50 text-slate-900">
    <Navbar />
    <main className={`min-h-[calc(100vh-72px)] pb-16 md:pb-0 ${appClass}`}><Routes>
      <Route path="/" element={currentUser ? <Navigate to="/feed" replace /> : <LandingPage />} />
      <Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} /><Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} /><Route path="/matches" element={<ProtectedRoute><SkillMatchesPage /></ProtectedRoute>} /><Route path="/exchanges" element={<ProtectedRoute><ExchangesPage /></ProtectedRoute>} /><Route path="/exchanges/:id" element={<ProtectedRoute><ExchangeIntegratedRoute /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} /><Route path="/messages/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/profile/:id" element={<ProtectedRoute><ProfileIntegratedRoute /></ProtectedRoute>} /><Route path="/trust" element={<ProtectedRoute><TrustSystemPage /></ProtectedRoute>} /><Route path="/trust/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} /><Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} /><Route path="/monetization" element={<ProtectedRoute><MonetizationPage /></ProtectedRoute>} /><Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/home/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/learning/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/discover/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/matches/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/requests/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/notifications/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/workshops/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/membership/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/support/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/settings/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} /><Route path="/activity/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} />
      <Route path="/screens/:id" element={<LegacyScreenRedirect />} /><Route path="/screens" element={<Navigate to="/feed" replace />} /><Route path="*" element={<Navigate to="/" replace />} />
    </Routes>{currentUser && <><PlatformEnhancements /><ProfessionalLayer /></>}</main>
    <div className={appClass}>{!isChat && <Footer />}</div>
    <MobileBottomNav />
  </div>;
};

export function App() { return <BrowserRouter><AuthProvider><SocketProvider><NotificationProvider><AppContent /></NotificationProvider></SocketProvider></AuthProvider></BrowserRouter>; }
export default App;
