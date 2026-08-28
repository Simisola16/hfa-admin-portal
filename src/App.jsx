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
import AdminAuditReports from './pages/AdminAuditReports';
import AdminInvoices from './pages/AdminInvoices';
import AdminMessages from './pages/AdminMessages';
import AdminSites from './pages/AdminSites';
import AdminProducts from './pages/AdminProducts';
import AdminReports from './pages/AdminReports';
import AdminProposals from './pages/AdminProposals';
import AdminAgreements from './pages/AdminAgreements';
import AdminExports from './pages/AdminExports';
import AdminLogsheets from './pages/AdminLogsheets';
import AdminCreateLogsheet from './pages/AdminCreateLogsheet';
import AdminLogsheetManage from './pages/AdminLogsheetManage';
import AdminLogsheetWaitingSignature from './pages/AdminLogsheetWaitingSignature';
import AdminLogsheetWaitingCertificate from './pages/AdminLogsheetWaitingCertificate';
import AdminTickets from './pages/AdminTickets';
import AdminSignatures from './pages/AdminSignatures';
import ApplicationProcessing from './pages/ApplicationProcessing';

import AdminAddOnApplications from './pages/AdminAddOnApplications';
import AdminAddOnProcessing from './pages/AdminAddOnProcessing';
import AdminAddOnApprovalForm from './pages/AdminAddOnApprovalForm';
import AdminInitialProducts from './pages/AdminInitialProducts';
import AdminInitialProductProcessing from './pages/AdminInitialProductProcessing';
import AdminManageProducts from './pages/AdminManageProducts';
import AdminStaff from './pages/AdminStaff';
import SuperAdminDirectCertificate from './pages/SuperAdminDirectCertificate';
import AdminReviewCertificate from './pages/AdminReviewCertificate';

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
            <Route path="/superadmin/direct-certificate" element={<SuperAdminDirectCertificate />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/applications/certified" element={<AdminApplications />} />
            <Route path="/initial-products" element={<AdminInitialProducts />} />
            <Route path="/initial-products/:id/processing" element={<AdminInitialProductProcessing />} />
            <Route path="/admin/initial-products" element={<AdminInitialProducts />} />
            <Route path="/admin/initial-products/:id/processing" element={<AdminInitialProductProcessing />} />
            <Route path="/addon-applications" element={<AdminAddOnApplications />} />
            <Route path="/addon-applications/:addonId/processing" element={<AdminAddOnProcessing />} />
            <Route path="/addon-applications/:addonId/approval-form" element={<AdminAddOnApprovalForm />} />
            <Route path="/addon-applications/:addonId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/applications/:appId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/applications/:appId/processing" element={<ApplicationProcessing />} />
            <Route path="/certificates" element={<AdminCertificates />} />
            <Route path="/certificates/review" element={<AdminCertificates defaultTab="review" />} />
            <Route path="/certificates/:id/review" element={<AdminReviewCertificate />} />
            <Route path="/clients" element={<AdminClients />} />
            <Route path="/staff" element={<AdminStaff />} />
            <Route path="/inspectors" element={<Navigate to="/audits" replace />} />
            <Route path="/audits" element={<AdminAudits />} />
            <Route path="/audit-reports" element={<AdminAuditReports />} />
            <Route path="/invoices" element={<AdminInvoices />} />
            <Route path="/messages" element={<AdminMessages />} />
            <Route path="/sites" element={<AdminSites />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/products/manage" element={<AdminManageProducts />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/proposals" element={<AdminProposals />} />
            <Route path="/agreements" element={<AdminAgreements />} />
            <Route path="/exports" element={<AdminExports />} />
            <Route path="/export" element={<AdminExports />} />
            <Route path="/logsheet/accounts" element={<AdminLogsheets />} />
            <Route path="/logsheet/products" element={<AdminLogsheets />} />
            <Route path="/logsheet/manage" element={<AdminLogsheetManage />} />
            <Route path="/logsheet/waiting-signature" element={<AdminLogsheetWaitingSignature />} />
            <Route path="/logsheet/waiting-certificate" element={<AdminLogsheetWaitingCertificate />} />
            <Route path="/logsheet/create" element={<Navigate to="/logsheet/manage" replace />} />
            <Route path="/logsheets/:id" element={<Navigate to="/logsheet/manage" replace />} />
            <Route path="/tickets" element={<AdminTickets />} />
            <Route path="/signatures" element={<AdminSignatures />} />
            <Route path="/users" element={<AdminClients />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
