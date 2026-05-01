import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';

import LoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminApplications from './pages/AdminApplications';
import AdminCertificates from './pages/AdminCertificates';
import AdminClients from './pages/AdminClients';
import AdminInspectors from './pages/AdminInspectors';
import AdminAudits from './pages/AdminAudits';
import AdminInvoices from './pages/AdminInvoices';
import AdminMessages from './pages/AdminMessages';
import AdminSites from './pages/AdminSites';
import AdminProducts from './pages/AdminProducts';
import AdminReports from './pages/AdminReports';
import AdminProposals from './pages/AdminProposals';
import AdminExports from './pages/AdminExports';
import AdminLogsheets from './pages/AdminLogsheets';
import AdminTickets from './pages/AdminTickets';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 13 } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/certificates" element={<AdminCertificates />} />
            <Route path="/clients" element={<AdminClients />} />
            <Route path="/inspectors" element={<AdminInspectors />} />
            <Route path="/audits" element={<AdminAudits />} />
            <Route path="/invoices" element={<AdminInvoices />} />
            <Route path="/messages" element={<AdminMessages />} />
            <Route path="/sites" element={<AdminSites />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/proposals" element={<AdminProposals />} />
            <Route path="/exports" element={<AdminExports />} />
            <Route path="/export" element={<AdminExports />} />
            <Route path="/logsheet/accounts" element={<AdminLogsheets />} />
            <Route path="/logsheet/products" element={<AdminLogsheets />} />
            <Route path="/tickets" element={<AdminTickets />} />
            <Route path="/users" element={<AdminClients />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
