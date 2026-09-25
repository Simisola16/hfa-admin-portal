import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

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
import AdminCreateCertificate from './pages/AdminCreateCertificate';
import AdminExtensionApplications from './pages/AdminExtensionApplications';
import AdminExtensionProcessing from './pages/AdminExtensionProcessing';
import AdminExtensionLogsheet from './pages/AdminExtensionLogsheet';
import AdminDirectLogsheet from './pages/AdminDirectLogsheet';
import AdminDirectProduct from './pages/AdminDirectProduct';
import AdminSurveillanceDueDates from './pages/AdminSurveillanceDueDates';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 5000, style: { borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 13 } }} />
        <ErrorBoundary isLayout={true}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/superadmin/direct-certificate" element={<SuperAdminDirectCertificate />} />
            <Route path="/superadmin/direct-logsheet" element={<AdminDirectLogsheet />} />
            <Route path="/superadmin/direct-product" element={<AdminDirectProduct />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/applications/certified" element={<AdminApplications />} />
            <Route path="/surveillance-due-dates" element={<AdminSurveillanceDueDates />} />
            <Route path="/admin/surveillance-due-dates" element={<AdminSurveillanceDueDates />} />
            <Route path="/initial-products" element={<AdminInitialProducts />} />
            <Route path="/initial-products/:id" element={<AdminInitialProductProcessing />} />
            <Route path="/initial-products/:id/processing" element={<AdminInitialProductProcessing />} />
            <Route path="/initial-products/:initialProductId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/admin/initial-products" element={<AdminInitialProducts />} />
            <Route path="/admin/initial-products/:id" element={<AdminInitialProductProcessing />} />
            <Route path="/admin/initial-products/:id/processing" element={<AdminInitialProductProcessing />} />
            <Route path="/admin/initial-products/:initialProductId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/addon-applications" element={<AdminAddOnApplications />} />
            <Route path="/addon-applications/:addonId" element={<AdminAddOnProcessing />} />
            <Route path="/addon-applications/:addonId/processing" element={<AdminAddOnProcessing />} />
            <Route path="/addon-applications/:addonId/approval-form" element={<AdminAddOnApprovalForm />} />
            <Route path="/addon-applications/:addonId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/admin/addon-applications" element={<AdminAddOnApplications />} />
            <Route path="/admin/addon-applications/:addonId" element={<AdminAddOnProcessing />} />
            <Route path="/admin/addon-applications/:addonId/processing" element={<AdminAddOnProcessing />} />
            <Route path="/admin/addon-applications/:addonId/approval-form" element={<AdminAddOnApprovalForm />} />
            <Route path="/admin/addon-applications/:addonId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/extension-applications" element={<AdminExtensionApplications />} />
            <Route path="/extension-applications/:id" element={<AdminExtensionProcessing />} />
            <Route path="/extension-applications/:id/processing" element={<AdminExtensionProcessing />} />
            <Route path="/extension-applications/:id/logsheet" element={<AdminExtensionLogsheet />} />
            <Route path="/admin/extension-applications" element={<AdminExtensionApplications />} />
            <Route path="/admin/extension-applications/:id" element={<AdminExtensionProcessing />} />
            <Route path="/admin/extension-applications/:id/processing" element={<AdminExtensionProcessing />} />
            <Route path="/admin/extension-applications/:id/logsheet" element={<AdminExtensionLogsheet />} />
            <Route path="/applications/:appId" element={<ApplicationProcessing />} />
            <Route path="/applications/:appId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/applications/:appId/processing" element={<ApplicationProcessing />} />
            <Route path="/admin/applications/:appId" element={<ApplicationProcessing />} />
            <Route path="/admin/applications/:appId/logsheet" element={<AdminCreateLogsheet />} />
            <Route path="/admin/applications/:appId/processing" element={<ApplicationProcessing />} />
            <Route path="/applications/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/admin/applications/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/addon-applications/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/admin/addon-applications/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/certificates/create/:appId" element={<AdminCreateCertificate />} />
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
            <Route path="/products/direct" element={<AdminDirectProduct />} />
            <Route path="/products/manage" element={<AdminManageProducts />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/proposals" element={<AdminProposals />} />
            <Route path="/agreements" element={<AdminAgreements />} />
            <Route path="/exports" element={<AdminExports />} />
            <Route path="/export" element={<AdminExports />} />
            <Route path="/logsheet/direct" element={<AdminDirectLogsheet />} />
            <Route path="/logsheet/direct/:id" element={<AdminDirectLogsheet />} />
            <Route path="/logsheet/accounts" element={<AdminLogsheets />} />
            <Route path="/logsheet/products" element={<AdminLogsheets />} />
            <Route path="/logsheet/manage" element={<AdminLogsheetManage />} />
            <Route path="/logsheet/waiting-signature" element={<AdminLogsheetWaitingSignature />} />
            <Route path="/logsheet/waiting-certificate" element={<AdminLogsheetWaitingCertificate />} />
            <Route path="/logsheet/create" element={<Navigate to="/logsheet/direct" replace />} />
            <Route path="/logsheets/:id" element={<Navigate to="/logsheet/manage" replace />} />
            <Route path="/tickets" element={<AdminTickets />} />
            <Route path="/signatures" element={<AdminSignatures />} />
            <Route path="/users" element={<AdminClients />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
