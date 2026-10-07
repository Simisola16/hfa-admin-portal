import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

const LoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminResetPasswordPage = lazy(() => import('./pages/AdminResetPasswordPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminApplications = lazy(() => import('./pages/AdminApplications'));
const AdminCertificates = lazy(() => import('./pages/AdminCertificates'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminAudits = lazy(() => import('./pages/AdminAudits'));
const AdminAuditReports = lazy(() => import('./pages/AdminAuditReports'));
const AdminInvoices = lazy(() => import('./pages/AdminInvoices'));
const AdminMessages = lazy(() => import('./pages/AdminMessages'));
const AdminSites = lazy(() => import('./pages/AdminSites'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminProposals = lazy(() => import('./pages/AdminProposals'));
const AdminAgreements = lazy(() => import('./pages/AdminAgreements'));
const AdminExports = lazy(() => import('./pages/AdminExports'));
const AdminLogsheets = lazy(() => import('./pages/AdminLogsheets'));
const AdminCreateLogsheet = lazy(() => import('./pages/AdminCreateLogsheet'));
const AdminCreateKFCLogsheet = lazy(() => import('./pages/AdminCreateKFCLogsheet'));
const AdminLogsheetManage = lazy(() => import('./pages/AdminLogsheetManage'));
const AdminLogsheetWaitingSignature = lazy(() => import('./pages/AdminLogsheetWaitingSignature'));
const AdminLogsheetWaitingCertificate = lazy(() => import('./pages/AdminLogsheetWaitingCertificate'));
const AdminTickets = lazy(() => import('./pages/AdminTickets'));
const AdminSignatures = lazy(() => import('./pages/AdminSignatures'));
const ApplicationProcessing = lazy(() => import('./pages/ApplicationProcessing'));

const AdminAddOnApplications = lazy(() => import('./pages/AdminAddOnApplications'));
const AdminAddOnProcessing = lazy(() => import('./pages/AdminAddOnProcessing'));
const AdminAddOnApprovalForm = lazy(() => import('./pages/AdminAddOnApprovalForm'));
const AdminInitialProducts = lazy(() => import('./pages/AdminInitialProducts'));
const AdminInitialProductProcessing = lazy(() => import('./pages/AdminInitialProductProcessing'));
const AdminManageProducts = lazy(() => import('./pages/AdminManageProducts'));
const AdminStaff = lazy(() => import('./pages/AdminStaff'));
const SuperAdminDirectCertificate = lazy(() => import('./pages/SuperAdminDirectCertificate'));
const AdminReviewCertificate = lazy(() => import('./pages/AdminReviewCertificate'));
const AdminCreateCertificate = lazy(() => import('./pages/AdminCreateCertificate'));
const AdminExtensionApplications = lazy(() => import('./pages/AdminExtensionApplications'));
const AdminExtensionProcessing = lazy(() => import('./pages/AdminExtensionProcessing'));
const AdminExtensionLogsheet = lazy(() => import('./pages/AdminExtensionLogsheet'));
const AdminDirectLogsheet = lazy(() => import('./pages/AdminDirectLogsheet'));
const AdminDirectProduct = lazy(() => import('./pages/AdminDirectProduct'));
const AdminSurveillanceDueDates = lazy(() => import('./pages/AdminSurveillanceDueDates'));
const SuperAdminLiveMonitor = lazy(() => import('./pages/SuperAdminLiveMonitor'));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{
      width: 34,
      height: 34,
      border: '3px solid #e2e8f0',
      borderTopColor: '#008744',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite'
    }} />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 5000, style: { borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 13 } }} />
        <ErrorBoundary isLayout={true}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<AdminResetPasswordPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/superadmin/live-monitor" element={<SuperAdminLiveMonitor />} />
            <Route path="/superadmin/direct-certificate" element={<SuperAdminDirectCertificate />} />
            <Route path="/superadmin/direct-logsheet" element={<AdminDirectLogsheet />} />
            <Route path="/superadmin/direct-product" element={<AdminDirectProduct />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/applications/accounts" element={<AdminApplications />} />
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
            <Route path="/logsheets/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/admin/logsheets/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/extension-applications/:appId/issue-certificate" element={<AdminCreateCertificate />} />
            <Route path="/admin/extension-applications/:appId/issue-certificate" element={<AdminCreateCertificate />} />
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
            <Route path="/logsheet/kfc" element={<AdminCreateKFCLogsheet />} />
            <Route path="/logsheet/kfc/:id" element={<AdminCreateKFCLogsheet />} />
            <Route path="/logsheet/accounts" element={<AdminLogsheets />} />
            <Route path="/logsheet/products" element={<AdminLogsheets />} />
            <Route path="/logsheet/manage" element={<AdminLogsheetManage />} />
            <Route path="/logsheet/waiting-signature" element={<AdminLogsheetWaitingSignature />} />
            <Route path="/logsheet/waiting-certificate" element={<AdminLogsheetWaitingCertificate />} />
            <Route path="/logsheets/:id/view" element={<AdminCreateLogsheet />} />
            <Route path="/logsheets/:id" element={<AdminCreateLogsheet />} />
            <Route path="/tickets" element={<AdminTickets />} />
            <Route path="/signatures" element={<AdminSignatures />} />
            <Route path="/users" element={<AdminClients />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
