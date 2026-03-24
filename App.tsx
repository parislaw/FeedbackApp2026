
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authClient } from './lib/auth-client';
import { MainApp } from './components/MainApp';
import { LoginPage } from './components/LoginPage';
import { InviteAcceptPage } from './components/InviteAcceptPage';
import { ReportHistoryPage } from './components/ReportHistoryPage';
import { AdminPanel } from './components/AdminPanel';

type SessionUser = { id: string; name: string; email: string; role?: string | null };

const App: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    authClient.getSession()
      .then(({ data }) => {
        if (data?.user) setSessionUser(data.user as SessionUser);
      })
      .finally(() => setIsPending(false));
  }, []);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAuth = !!sessionUser;
  const isAdmin = sessionUser?.role === 'admin';

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />

      {/* Auth-protected routes */}
      <Route path="/" element={isAuth ? <MainApp /> : <Navigate to="/login" replace />} />
      <Route path="/reports" element={isAuth ? <ReportHistoryPage /> : <Navigate to="/login" replace />} />

      {/* Admin-only route */}
      <Route path="/admin" element={isAdmin ? <AdminPanel /> : <Navigate to="/" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuth ? '/' : '/login'} replace />} />
    </Routes>
  );
};

export default App;
