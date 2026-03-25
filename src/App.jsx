import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

// MSME pages
import MSMEDashboard from './pages/msme/Dashboard';
import UploadInvoice from './pages/msme/UploadInvoice';
import VerificationStatus from './pages/msme/VerificationStatus';
import FundingOffers from './pages/msme/FundingOffers';
import ReceiveMoney from './pages/msme/ReceiveMoney';

// Funder pages
import FunderDashboard from './pages/funder/Dashboard';
import AvailableInvoices from './pages/funder/AvailableInvoices';
import RiskScores from './pages/funder/RiskScores';
import PortfolioPerformance from './pages/funder/PortfolioPerformance';

// Buyer pages
import BuyerDashboard from './pages/buyer/Dashboard';
import ConfirmInvoice from './pages/buyer/ConfirmInvoice';
import TrackFinancing from './pages/buyer/TrackFinancing';
import MakePayment from './pages/buyer/MakePayment';

function RoleRedirect() {
  const { userRole, loading } = useAuth();
  if (loading) return null;
  const routes = { msme: '/msme', funder: '/funder', buyer: '/buyer' };
  return <Navigate to={routes[userRole] || '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* MSME Console */}
          <Route path="/msme" element={
            <ProtectedRoute allowedRole="msme"><Layout /></ProtectedRoute>
          }>
            <Route index element={<MSMEDashboard />} />
            <Route path="upload" element={<UploadInvoice />} />
            <Route path="verification" element={<VerificationStatus />} />
            <Route path="offers" element={<FundingOffers />} />
            <Route path="receive" element={<ReceiveMoney />} />
          </Route>

          {/* Funder Dashboard */}
          <Route path="/funder" element={
            <ProtectedRoute allowedRole="funder"><Layout /></ProtectedRoute>
          }>
            <Route index element={<FunderDashboard />} />
            <Route path="invoices" element={<AvailableInvoices />} />
            <Route path="risk" element={<RiskScores />} />
            <Route path="portfolio" element={<PortfolioPerformance />} />
          </Route>

          {/* Buyer Portal */}
          <Route path="/buyer" element={
            <ProtectedRoute allowedRole="buyer"><Layout /></ProtectedRoute>
          }>
            <Route index element={<BuyerDashboard />} />
            <Route path="confirm" element={<ConfirmInvoice />} />
            <Route path="financing" element={<TrackFinancing />} />
            <Route path="payment" element={<MakePayment />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
