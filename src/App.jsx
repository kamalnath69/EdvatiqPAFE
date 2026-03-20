import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import { useAuthUser } from './hooks/useAuthUser';

const Landing = lazy(() => import('./pages/Landing'));
const Signup = lazy(() => import('./pages/Signup'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const StaffDashboard = lazy(() => import('./components/StaffDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));

function ProtectedDashboard() {
  const { user, loadingUser } = useAuthUser();
  if (loadingUser) {
    return <div className="page-loading">Loading your workspace...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'academy_admin' || user.role === 'academyAdmin' || user.role === 'staff') return <StaffDashboard />;
  if (user.role === 'student') return <StudentDashboard />;
  return <Navigate to="/login" replace />;
}

function LoginGate() {
  const { user, loadingUser } = useAuthUser();
  if (loadingUser) {
    return <div className="page-loading">Checking your session...</div>;
  }
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loading">Loading workspace...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Navigate to="/#plans" replace />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/book-demo" element={<Navigate to="/#book-demo" replace />} />
          <Route path="/support" element={<Navigate to="/#book-demo" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<LoginGate />} />
          <Route path="/dashboard" element={<ProtectedDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
