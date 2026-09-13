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
import { AdditionalScreensIndex, AdditionalScreen } from './pages/AdditionalScreensPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Authenticating community member...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
          <Route path="/screens" element={<ProtectedRoute><AdditionalScreensIndex /></ProtectedRoute>} />
          <Route path="/screens/:id" element={<ProtectedRoute><AdditionalScreen /></ProtectedRoute>} />
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
