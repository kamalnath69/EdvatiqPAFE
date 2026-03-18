import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import Login from './components/Login';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Signup from './pages/Signup';
import Support from './pages/Support';
import BookDemo from './pages/BookDemo';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import StudentDashboard from './components/StudentDashboard';
import { AuthContext } from './context/auth-context';

function ProtectedDashboard() {
  const { user, loadingUser } = useContext(AuthContext);
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
  const { user, loadingUser } = useContext(AuthContext);
  if (loadingUser) {
    return <div className="page-loading">Checking your session...</div>;
  }
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/book-demo" element={<BookDemo />} />
        <Route path="/support" element={<Support />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<LoginGate />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
