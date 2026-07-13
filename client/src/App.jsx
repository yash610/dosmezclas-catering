import { Navigate, Route, Routes } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext.jsx';

import TopNav from './components/TopNav.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import RequestQuote from './pages/RequestQuote.jsx';
import QuoteResult from './pages/QuoteResult.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminLeads from './pages/AdminLeads.jsx';

function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function PrivateAdmin({ children }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="p-10 text-cream/70">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/request-quote" element={<PublicLayout><RequestQuote /></PublicLayout>} />
      <Route path="/quote-result" element={<PublicLayout><QuoteResult /></PublicLayout>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/leads" element={<PrivateAdmin><AdminLeads /></PrivateAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
