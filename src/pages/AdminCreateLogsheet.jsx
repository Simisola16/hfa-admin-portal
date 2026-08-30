import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  UploadCloud, ChevronLeft, Building, FileText, Award, MessageSquare,
  Clock, CheckCircle2, CheckCircle, CheckSquare, PenTool, Check, ShieldCheck,
  X, AlertTriangle, ArrowRight, Calendar, User, MapPin, Tag, Download, Eye, Package, Lock
} from 'lucide-react';
import { getPdfUrl } from '../lib/pdfUtils';
import { useAuth } from '../context/AuthContext';
import ProductApprovalModal from '../components/ProductApprovalModal';

export default function AdminCreateLogsheet() {
  const { appId, addonId, initialProductId, id } = useParams();
  const isInitialProduct = !!initialProductId || window.location.pathname.includes('/initial-products/');
  const resolvedInitialProductId = initialProductId || (isInitialProduct ? (id || appId) : null);
  const isAddon = !!addonId;
  const isProductLogsheet = isAddon || isInitialProduct;
  const entityId = isInitialProduct ? resolvedInitialProductId : (isAddon ? addonId : appId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [application, setApplication] = useState(null);
  const [viewProductModal, setViewProductModal] = useState({ isOpen: false, formData: null, product: null, company: null });

  const [signatures, setSignatures] = useState([]);
  const [currentLogsheet, setCurrentLogsheet] = useState(null);
  const [sigRole, setSigRole] = useState('');
  const [sigComment, setSigComment] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isSendingWithoutSig, setIsSendingWithoutSig] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [clientProducts, setClientProducts] = useState([]);

  // Signing Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [modalConfirmed, setModalConfirmed] = useState(false);

  // Approve Products Modal State (Add-on Logsheet Only)
  const [showApproveProductsModal, setShowApproveProductsModal] = useState(false);
  const [selectedApproveProducts, setSelectedApproveProducts] = useState([]);

  const userSignature = signatures.find(s =>
    (s.user_id && (s.user_id === user?.id || s.user_id === user?._id)) ||
    (s.username && user?.email && s.username.toLowerCase() === user.email.split('@')[0].toLowerCase()) ||
    (s.name && user?.full_name && s.name.toLowerCase() === user.full_name.toLowerCase())
  );
  const userRole = (user?.role || '').toLowerCase();
  const userUsername = (user?.username || '').toLowerCase();
  const userFullName = (user?.full_name || '').toLowerCase();
  const isMuftiUser = userRole === 'mufti' || userRole === 'shariah' || userUsername.includes('mufti') || userFullName.includes('mufti');

  const [form, setForm] = useState({
    site_name: '', company_name: '', company_address: '', manufacturing_address: '',
    contact_person: '', contact_email: '', issue_date: '', expiry_date: '',
    nature_of_business: '', product_category: '', current_cycle_start: '',
    original_cycle_start: '', document_url: '', document_urls: [], audit_reports: [],

    audit_type: 'New', audit_date: '', auditors: '', ncs_close: '',
    docs_satisfactory: '', pork_free_statement: '', reviewed_by: '',
    reviewer_name: '', review_date: '',

    annual_certificate: 'Yes', batch_certificate: 'No', new_products_only: 'No',
    new_site_line: 'No', new_client: 'No', agreement_signed: 'Yes', status_date: '',

    comment: '', confirmed: false
  });

  const [uploadingReport, setUploadingReport] = useState(false);

  useEffect(() => {
    fetchData();
  }, [entityId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (!entityId || entityId === 'undefined') {
        toast.error('Invalid application reference.');
        setLoading(false);
        return;
      }

      if (isAddon) {
        if (!addonId || addonId === 'undefined') {
          toast.error('Invalid Add-on application reference.');
          setLoading(false);
          return;
        }
        const addonRes = await api.get(`/api/add-on-applications/${addonId}`);
        const addonData = addonRes.data?.data || addonRes.data;
        setApplication(addonData);

        let addonClient = addonData.client_id;
        if (typeof addonClient === 'string' || (addonClient && !addonClient.address)) {
          try {
            const uId = addonClient?._id || addonClient;
            if (uId) {
              const uRes = await api.get(`/api/users/${uId}`).catch(() => null);
              if (uRes?.data?.data || uRes?.data) {
                addonClient = { ...(typeof addonClient === 'object' ? addonClient : {}), ...(uRes.data.data || uRes.data) };
              }
            }
          } catch (e) { }
        }

        const addonClientAddr = [
          addonClient?.address,
          addonClient?.city,
          addonClient?.postcode,
          addonClient?.country
        ].filter(Boolean).join(', ') || addonClient?.address || '';

        const addonSite = addonData.site_id;
        const addonSiteAddr = addonSite ? [
          addonSite.address_1,
          addonSite.address_2,
          addonSite.city,
          addonSite.state,
          addonSite.postcode || addonSite.postal_code,
          addonSite.country
        ].filter(Boolean).join(', ') || addonSite.address || '' : '';

        const autoSiteName = addonSite?.name
          || addonData?.site_name
          || addonData?.site_id?.name
          || addonData?.establishment_name
          || addonSite?.est_name
          || 'Main Manufacturing Site';

        const autoCompanyName = addonClient?.company_name
          || addonData?.profiles?.company_name
          || addonData?.company_name
          || addonClient?.business_name
          || addonClient?.full_name
          || '';
        const autoContactPerson = addonData.contact_name || addonClient?.full_name || '';
        const autoContactEmail = addonData.contact_email || addonClient?.email || '';

        let autoCompanyAddress = addonClientAddr
          || addonSite?.head_office_address
          || addonData.establishment_address
          || addonData.application_id?.establishment_address
          || '';

        let autoManufacturingAddress = addonData.manufacturer_address
          || addonSiteAddr
          || addonData.application_id?.manufacturer_address
          || autoCompanyAddress;

        const autoNature = addonData.category || addonData.application_type || 'Add-on Product Certification';
        const autoProductCat = addonData.products?.length > 0 ? addonData.products.map(p => p.name || p.title).filter(Boolean).join(', ') : (addonData.category || 'Add-on Products');

        // FT Assignment extraction for Product Logsheet
        const assignedFTsList = Array.isArray(addonData.assigned_food_techs) && addonData.assigned_food_techs.length > 0
          ? addonData.assigned_food_techs.map(ft => ft.full_name || ft.name || ft.email).filter(Boolean).join(', ')
          : (addonData.assigned_food_tech?.full_name || addonData.assigned_food_tech?.name || '');

        const autoFTs = assignedFTsList || (user?.full_name ? `${user.full_name} (Food Technologist)` : 'Food Technologist');
        const autoAuditType = addonData.application_type || 'Add-on Products Certification';

        // Check if logsheet already exists
        let addonLogsheet = null;
        try {
          const logRes = await api.get(`/api/add-on-applications/${addonId}/logsheet`);
          addonLogsheet = logRes.data?.data || logRes.data;
        } catch (e) { /* No logsheet yet */ }

        if (addonLogsheet && addonLogsheet._id) {
          setCurrentLogsheet(addonLogsheet);

          let resolvedCompanyName = addonLogsheet.company_name;
          if (!resolvedCompanyName || (resolvedCompanyName === autoSiteName && autoCompanyName && autoCompanyName !== autoSiteName)) {
            resolvedCompanyName = autoCompanyName;
          }

          setForm(f => ({
            ...f,
            ...addonLogsheet,
            site_name: (addonLogsheet.site_name && addonLogsheet.site_name.trim()) ? addonLogsheet.site_name : autoSiteName,
            company_name: (resolvedCompanyName && resolvedCompanyName.trim()) ? resolvedCompanyName : autoCompanyName,
            company_address: (addonLogsheet.company_address && addonLogsheet.company_address.trim()) ? addonLogsheet.company_address : autoCompanyAddress,
            manufacturing_address: (addonLogsheet.manufacturing_address && addonLogsheet.manufacturing_address.trim()) ? addonLogsheet.manufacturing_address : autoManufacturingAddress,
            audit_type: addonLogsheet.audit_type || autoAuditType,
            auditors: addonLogsheet.auditors || autoFTs,
            ncs_close: addonLogsheet.ncs_close || 'N/A - Product Evaluation',
            confirmed: false
          }));
        } else {
          setForm(f => ({
            ...f,
            site_name: autoSiteName,
            company_name: autoCompanyName,
            company_address: autoCompanyAddress,
            manufacturing_address: autoManufacturingAddress,
            contact_person: autoContactPerson,
            contact_email: autoContactEmail,
            nature_of_business: autoNature,
            product_category: autoProductCat,
            issue_date: todayStr,
            expiry_date: oneYearLater,
            current_cycle_start: todayStr,
            original_cycle_start: addonData.created_at ? new Date(addonData.created_at).toISOString().split('T')[0] : todayStr,

            audit_type: autoAuditType,
            audit_date: todayStr,
            auditors: autoFTs,
            ncs_close: 'N/A - Product Evaluation',
            docs_satisfactory: 'Satisfactory - all product specifications and formulations verified',
            pork_free_statement: 'Confirmed - signed pork-free declaration in place',
            reviewed_by: user?.full_name || 'HFA Food Technology Dept',
            reviewer_name: user?.full_name || 'Food Technologist Reviewer',
            review_date: todayStr,
            annual_certificate: 'No',
            batch_certificate: 'No',
            new_products_only: 'Yes',
            new_site_line: 'No',
            new_client: 'No',
            agreement_signed: 'Yes',
            status_date: todayStr,
            comment: 'Recommended for add-on product certification endorsement.',
            confirmed: false
          }));
        }
      } else if (isInitialProduct) {
        if (!resolvedInitialProductId || resolvedInitialProductId === 'undefined') {
          toast.error('Invalid Initial Product reference.');
          setLoading(false);
          return;
        }

        const ipRes = await api.get(`/api/initial-products/${resolvedInitialProductId}`);
        const ipData = ipRes.data?.data || ipRes.data;
        setApplication(ipData);

        let ipClient = ipData.client_id;
        if (typeof ipClient === 'string' || (ipClient && !ipClient.address)) {
          try {
            const uId = ipClient?._id || ipClient;
            if (uId) {
              const uRes = await api.get(`/api/users/${uId}`).catch(() => null);
              if (uRes?.data?.data || uRes?.data) {
                ipClient = { ...(typeof ipClient === 'object' ? ipClient : {}), ...(uRes.data.data || uRes.data) };
              }
            }
          } catch (e) { }
        }

        const ipClientAddr = [
          ipClient?.address,
          ipClient?.city,
          ipClient?.postcode,
          ipClient?.country
        ].filter(Boolean).join(', ') || ipClient?.address || '';

        const ipSite = ipData.site_id;
        const ipSiteAddr = ipSite ? [
          ipSite.address_1,
          ipSite.address_2,
          ipSite.city,
          ipSite.state,
          ipSite.postcode || ipSite.postal_code,
          ipSite.country
        ].filter(Boolean).join(', ') || ipSite.address || '' : '';

        const autoSiteName = ipSite?.name
          || ipData?.site_name
          || ipData?.application_id?.site_name
          || ipData?.application_id?.establishment_name
          || 'Main Manufacturing Site';

        const autoCompanyName = ipClient?.company_name
          || ipData?.company_name
          || ipClient?.business_name
          || ipClient?.full_name
          || '';
        const autoContactPerson = ipData.contact_name || ipClient?.full_name || '';
        const autoContactEmail = ipData.contact_email || ipClient?.email || '';

        let autoCompanyAddress = ipClientAddr
          || ipSite?.head_office_address
          || ipData.application_id?.establishment_address
          || '';

        let autoManufacturingAddress = ipSiteAddr
          || ipData.application_id?.manufacturer_address
          || autoCompanyAddress;

        const autoNature = ipData.product?.category || ipData.application_id?.category || 'Initial Product Certification';
        const autoProductCat = ipData.product?.name ? `${ipData.product.name}${ipData.product.code ? ` (${ipData.product.code})` : ''}` : 'Initial Product';

        // FT Assignment extraction for Product Logsheet
        const assignedFTsList = Array.isArray(ipData.assigned_food_techs) && ipData.assigned_food_techs.length > 0
          ? ipData.assigned_food_techs.map(ft => ft.full_name || ft.name || ft.email).filter(Boolean).join(', ')
          : (ipData.assigned_food_tech?.full_name || ipData.assigned_food_tech?.name || ipData.assigned_ft_custom?.name || ipData.assigned_ft_details || '');

        const autoFTs = assignedFTsList || (user?.full_name ? `${user.full_name} (Food Technologist)` : 'Food Technologist');
        const autoAuditType = 'Initial Product Evaluation';

        // Check if logsheet already exists
        let ipLogsheet = (ipData.logsheet_id && typeof ipData.logsheet_id === 'object' && ipData.logsheet_id._id) ? ipData.logsheet_id : null;
        if (!ipLogsheet) {
          try {
            const logRes = await api.get(`/api/application-logsheets?initial_product_application_id=${resolvedInitialProductId}`);
            const list = Array.isArray(logRes.data?.data) ? logRes.data.data : (Array.isArray(logRes.data) ? logRes.data : []);
            ipLogsheet = list[0] || null;
          } catch (e) { /* No logsheet yet */ }
        }
        if (!ipLogsheet && ipData.logsheet_id) {
          try {
            const logsheetId = ipData.logsheet_id._id || ipData.logsheet_id;
            const logRes = await api.get(`/api/application-logsheets/${logsheetId}`);
            ipLogsheet = logRes.data?.data || logRes.data;
          } catch (e) { /* fallback */ }
        }

        if (ipLogsheet && ipLogsheet._id) {
          setCurrentLogsheet(ipLogsheet);

          let resolvedCompanyName = ipLogsheet.company_name;
          if (!resolvedCompanyName || (resolvedCompanyName === autoSiteName && autoCompanyName && autoCompanyName !== autoSiteName)) {
            resolvedCompanyName = autoCompanyName;
          }

          setForm(f => ({
            ...f,
            ...ipLogsheet,
            site_name: (ipLogsheet.site_name && ipLogsheet.site_name.trim()) ? ipLogsheet.site_name : autoSiteName,
            company_name: (resolvedCompanyName && resolvedCompanyName.trim()) ? resolvedCompanyName : autoCompanyName,
            company_address: (ipLogsheet.company_address && ipLogsheet.company_address.trim()) ? ipLogsheet.company_address : autoCompanyAddress,
            manufacturing_address: (ipLogsheet.manufacturing_address && ipLogsheet.manufacturing_address.trim()) ? ipLogsheet.manufacturing_address : autoManufacturingAddress,
            audit_type: ipLogsheet.audit_type || autoAuditType,
            auditors: ipLogsheet.auditors || autoFTs,
            ncs_close: ipLogsheet.ncs_close || 'N/A - Initial Product Evaluation',
            confirmed: false
          }));
        } else {
          setForm(f => ({
            ...f,
            site_name: autoSiteName,
            company_name: autoCompanyName,
            company_address: autoCompanyAddress,
            manufacturing_address: autoManufacturingAddress,
            contact_person: autoContactPerson,
            contact_email: autoContactEmail,
            nature_of_business: autoNature,
            product_category: autoProductCat,
            issue_date: todayStr,
            expiry_date: oneYearLater,
            current_cycle_start: todayStr,
            original_cycle_start: ipData.createdAt ? new Date(ipData.createdAt).toISOString().split('T')[0] : todayStr,

            audit_type: autoAuditType,
            audit_date: todayStr,
            auditors: autoFTs,
            ncs_close: 'N/A - Initial Product Evaluation',
            docs_satisfactory: 'Satisfactory - all product specifications and formulations verified',
            pork_free_statement: 'Confirmed - signed pork-free declaration in place',
            reviewed_by: user?.full_name || 'HFA Food Technology Dept',
            reviewer_name: user?.full_name || 'Food Technologist Reviewer',
            review_date: todayStr,
            annual_certificate: 'No',
            batch_certificate: 'No',
            new_products_only: 'Yes',
            new_site_line: 'No',
            new_client: 'No',
            agreement_signed: 'Yes',
            status_date: todayStr,
            comment: 'Recommended for initial product approval endorsement.',
            confirmed: false
          }));
        }
      } else {
        // ── Main application flow ─────────────────────────────────────────
        if (!appId || appId === 'undefined') {
          toast.error('Invalid Application reference.');
          setLoading(false);
          return;
        }

        // 1. Fetch application details
        const appRes = await api.get(`/api/applications/${appId}`);
        const appData = appRes.data?.data || appRes.data;
        setApplication(appData);

        // 2. Fetch audit details (if any)
        let auditData = null;
        try {
          const auditRes = await api.get(`/api/audits/application/${appId}`);
          auditData = auditRes.data?.data || auditRes.data;
        } catch (e) {
          console.log('No audit found for this application yet');
        }

        // Fetch client products
        try {
          const cId = appData?.client_id?._id || appData?.client_id;
          if (cId) {
            const pRes = await api.get(`/api/products?client_id=${cId}`).catch(() => ({ data: [] }));
            const pList = Array.isArray(pRes.data?.data) ? pRes.data.data : (Array.isArray(pRes.data) ? pRes.data : []);
            setClientProducts(pList);
          }
        } catch (pErr) { }

        // Automatic extraction of Company & Site details from application & audits & user profile
        let clientData = appData?.client_id;
        const clientIdStr = (typeof clientData === 'object' && clientData?._id)
          ? clientData._id
          : (typeof clientData === 'string' ? clientData : (appData?.profiles?._id || null));

        if (clientIdStr) {
          try {
            const uRes = await api.get(`/api/users/${clientIdStr}`).catch(() => null);
            if (uRes?.data?.data || uRes?.data) {
              clientData = { ...(typeof clientData === 'object' ? clientData : {}), ...(uRes.data.data || uRes.data) };
            }
          } catch (e) { }
        }

        let siteData = appData?.site
          || (typeof appData?.site_id === 'object' && appData.site_id ? appData.site_id : null)
          || appData?.sites?.[0]
          || null;

        const siteIdStr = siteData?._id
          || (typeof appData?.site_id === 'string' ? appData.site_id : null);

        if (!siteData && siteIdStr) {
          try {
            const sRes = await api.get(`/api/sites/${siteIdStr}`).catch(() => null);
            if (sRes?.data?.data || sRes?.data) {
              siteData = sRes.data.data || sRes.data;
            }
          } catch (e) { }
        }

        const clientFullAddr = [
          clientData?.address || appData?.profiles?.address || clientData?.registered_address || clientData?.head_office_address || clientData?.street,
          clientData?.city || appData?.profiles?.city,
          clientData?.postcode || appData?.profiles?.postcode,
          clientData?.country || appData?.profiles?.country
        ].filter(Boolean).join(', ');

        const siteFullAddr = siteData ? [
          siteData.address_1 || siteData.address,
          siteData.address_2,
          siteData.city,
          siteData.state,
          siteData.postcode,
          siteData.country
        ].filter(Boolean).join(', ') : (siteData?.address || '');

        const siteHeadOffice = siteData?.head_office_address || siteData?.head_office || '';

        const autoSiteName = siteData?.name
          || appData?.site_name
          || appData?.site_id?.name
          || appData?.establishment_name
          || appData?.site_id?.est_name
          || 'Main Manufacturing Site';

        const autoCompanyName = clientData?.company_name
          || appData?.profiles?.company_name
          || appData?.company_name
          || clientData?.business_name
          || clientData?.full_name
          || appData?.profiles?.full_name
          || '';

        let autoManufacturingAddress = appData?.manufacturer_address
          || siteFullAddr
          || appData?.establishment_address
          || '';

        let autoCompanyAddress = clientFullAddr
          || siteHeadOffice
          || clientData?.address
          || clientData?.registered_address
          || appData?.establishment_address
          || appData?.profiles?.address
          || autoManufacturingAddress
          || siteFullAddr
          || '';

        if (!autoManufacturingAddress) {
          autoManufacturingAddress = siteFullAddr || autoCompanyAddress || appData?.establishment_address || 'United Kingdom';
        }

        if (!autoCompanyAddress) {
          autoCompanyAddress = autoManufacturingAddress || (autoCompanyName ? `${autoCompanyName}, United Kingdom` : 'United Kingdom');
        }

        // 3. See if main facility logsheet exists
        let logsheetObj = null;
        try {
          const logRes = await api.get(`/api/application-logsheets/application/${appId}`);
          const raw = logRes.data?.data || logRes.data;
          if (
            raw &&
            !raw.error &&
            raw._id &&
            raw.source_type !== 'initial_product_application' &&
            raw.source_type !== 'addon_application' &&
            !raw.initial_product_application_id &&
            !raw.addon_application_id &&
            raw.audit_type !== 'Initial Product Evaluation'
          ) {
            logsheetObj = raw;
          }
        } catch (e) {
          // Not found yet
        }

        if (logsheetObj && logsheetObj._id) {
          setCurrentLogsheet(logsheetObj);

          let resolvedCompanyName = logsheetObj.company_name;
          if (!resolvedCompanyName || (resolvedCompanyName === autoSiteName && autoCompanyName && autoCompanyName !== autoSiteName)) {
            resolvedCompanyName = autoCompanyName;
          }

          setForm(f => ({
            ...f,
            ...logsheetObj,
            site_name: (logsheetObj.site_name && logsheetObj.site_name.trim()) ? logsheetObj.site_name : autoSiteName,
            company_name: (resolvedCompanyName && resolvedCompanyName.trim()) ? resolvedCompanyName : autoCompanyName,
            company_address: (logsheetObj.company_address && logsheetObj.company_address.trim()) ? logsheetObj.company_address : autoCompanyAddress,
            manufacturing_address: (logsheetObj.manufacturing_address && logsheetObj.manufacturing_address.trim()) ? logsheetObj.manufacturing_address : autoManufacturingAddress,
            confirmed: false
          }));
        } else {
          const autoContactPerson = appData?.halal_coordinator || appData?.qa_contact || appData?.managing_director || clientData?.full_name || appData?.profiles?.full_name || '';
          const autoContactEmail = clientData?.email || appData?.profiles?.email || appData?.finance_contact || '';
          const autoNature = appData?.scope || appData?.business_type || appData?.category || 'Halal Food Production & Processing';
          const autoProductCategory = appData?.category || appData?.product_category || (appData?.products?.length > 0 ? appData.products.map(p => p.name || p.category).filter(Boolean).slice(0, 5).join(', ') : '') || '';

          let autoAuditType = 'New';
          if (appData?.application_type) {
            const lt = appData.application_type.toLowerCase();
            if (lt.includes('initial') || lt.includes('new')) autoAuditType = 'New';
            else if (lt.includes('surveillance')) autoAuditType = 'Surveillance';
            else if (lt.includes('renewal') || lt.includes('re-audit')) autoAuditType = 'Re-audit';
          }

          const auditsArr = Array.isArray(auditData) ? auditData : (auditData ? [auditData] : []);
          const primaryAudit = auditsArr[0] || null;

          let autoAuditDate = '';
          let autoAuditors = '';
          let autoNcsClose = 'No NCs flagged';

          if (primaryAudit) {
            if (primaryAudit.finalized_date) {
              autoAuditDate = new Date(primaryAudit.finalized_date).toISOString().split('T')[0];
            } else if (primaryAudit.scheduled_date) {
              autoAuditDate = new Date(primaryAudit.scheduled_date).toISOString().split('T')[0];
            } else if (primaryAudit.selected_dates && primaryAudit.selected_dates.length > 0) {
              autoAuditDate = new Date(primaryAudit.selected_dates[0]).toISOString().split('T')[0];
            }

            if (primaryAudit.auditors && primaryAudit.auditors.length > 0) {
              autoAuditors = primaryAudit.auditors.map(a => a.name || a.full_name).filter(Boolean).join(', ');
            }

            if (primaryAudit.nc_reports) {
              const outstanding = primaryAudit.nc_reports.filter(nc => nc.status !== 'corrected' && nc.status !== 'closed');
              if (primaryAudit.nc_reports.length === 0) {
                autoNcsClose = 'No NCs flagged';
              } else if (outstanding.length === 0) {
                autoNcsClose = 'All NCs closed and verified';
              } else {
                autoNcsClose = `${outstanding.length} NC(s) outstanding`;
              }
            }
          } else if (appData?.audit_date) {
            autoAuditDate = new Date(appData.audit_date).toISOString().split('T')[0];
          }

          const existingReports = appData?.audit_reports?.map(r => ({ name: r.name || 'Audit_Report.pdf', url: r.url, uploaded_at: r.uploaded_at })) || [];

          setForm(f => ({
            ...f,
            site_name: autoSiteName,
            company_name: autoCompanyName,
            company_address: autoCompanyAddress,
            manufacturing_address: autoManufacturingAddress,
            contact_person: autoContactPerson,
            contact_email: autoContactEmail,
            nature_of_business: autoNature,
            product_category: autoProductCategory,
            issue_date: todayStr,
            expiry_date: oneYearLater,
            current_cycle_start: autoAuditDate || todayStr,
            original_cycle_start: appData?.created_at ? new Date(appData.created_at).toISOString().split('T')[0] : todayStr,

            audit_type: autoAuditType,
            audit_date: autoAuditDate || todayStr,
            auditors: autoAuditors || (user?.full_name ? `${user.full_name} (Lead Auditor)` : 'Lead Auditor'),
            ncs_close: autoNcsClose,
            docs_satisfactory: 'Satisfactory - all documentation verified',
            pork_free_statement: 'Confirmed - signed pork-free declaration in place',
            reviewed_by: user?.full_name || 'HFA Technical Committee',
            reviewer_name: user?.full_name || 'Technical Reviewer',
            review_date: todayStr,

            annual_certificate: 'Yes',
            batch_certificate: 'No',
            new_products_only: 'No',
            new_site_line: 'No',
            new_client: (autoAuditType === 'New' || autoAuditType === 'Initial') ? 'Yes' : 'No',
            agreement_signed: 'Yes',
            status_date: todayStr,

            comment: 'Recommended for Halal certification approval following successful audit and compliance review.',
            confirmed: false,

            document_urls: existingReports,
            audit_reports: existingReports,
            document_url: existingReports[0]?.url || ''
          }));
        }
      }

      // Fetch signatures for signing panel (shared for both modes)
      try {
        const sigsRes = await api.get('/api/signatures');
        setSignatures(Array.isArray(sigsRes) ? sigsRes : []);
      } catch (e) {
        console.log('Failed to fetch signatures', e);
      }
    } catch (err) {
      toast.error('Failed to load application data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingReport(true);
    const toastId = toast.loading(`Uploading ${files.length} document(s)...`);
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const url = await api.uploadPdf(file, 'audit_reports');
        if (!url) throw new Error(`Upload failed for file "${file.name}"`);
        uploadedDocs.push({
          name: file.name,
          url,
          uploaded_at: new Date()
        });
      }
      setForm(prev => {
        const existing = Array.isArray(prev.document_urls) ? prev.document_urls : [];
        const combined = [...existing, ...uploadedDocs];
        return {
          ...prev,
          document_url: combined[0]?.url || '',
          document_urls: combined,
          audit_reports: combined
        };
      });
      toast.success(`${files.length} audit report document(s) uploaded successfully!`, { id: toastId });
    } catch (err) {
      console.error('Audit report upload error:', err);
      toast.error(err.message || 'Upload failed. Please try again.', { id: toastId });
    } finally {
      setUploadingReport(false);
      e.target.value = '';
    }
  };

  const openSigningModal = (roleToPreselect = null) => {
    if (!userSignature) {
      toast.error('Your authenticated user account does not have an uploaded digital signature. Please upload one under Signatures first.');
      return;
    }

    if (isMuftiUser && (roleToPreselect === 'Ceo' || roleToPreselect === 'Manager')) {
      toast.error('Mufti / Shariah Scholar signatories cannot sign for CEO or Technical Auditor / Manager roles.');
      return;
    }

    const unsignedRoles = [
      { key: 'Mufti', isSigned: !!currentLogsheet?.mufti_signature },
      { key: 'Ceo', isSigned: !!currentLogsheet?.ceo_signature },
      { key: 'Manager', isSigned: !!currentLogsheet?.manager_signature },
      { key: 'Mufti2', isSigned: !!currentLogsheet?.mufti2_signature },
    ].filter(r => !r.isSigned && (!isMuftiUser || (r.key === 'Mufti' || r.key === 'Mufti2'))).map(r => r.key);

    if (roleToPreselect && unsignedRoles.includes(roleToPreselect)) {
      setSigRole(roleToPreselect);
    } else if (unsignedRoles.length > 0) {
      setSigRole(unsignedRoles[0]);
    } else {
      setSigRole('');
    }
    setModalConfirmed(false);
    setShowSignModal(true);
  };

  const handleConfirmApplySignature = async () => {
    if (!sigRole) {
      toast.error('Please select a single signatory role to sign');
      return;
    }
    if (!modalConfirmed) {
      toast.error('Please check the confirmation box before applying signature');
      return;
    }

    if (!userSignature) {
      toast.error('No authenticated digital signature available.');
      return;
    }

    if (isMuftiUser && (sigRole === 'Ceo' || sigRole === 'Manager')) {
      toast.error('Mufti signatories cannot sign for CEO or Technical Auditor roles.');
      return;
    }

    setIsSigning(true);
    try {
      const signerFullName = user?.full_name || userSignature?.name || user?.username || 'Authorized Signatory';

      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        role: sigRole,
        signature_url: userSignature.signature_url,
        signature_name: signerFullName,
        comment: sigComment
      });
      toast.success(`Logsheet signed successfully as ${sigRole}!`);
      setShowSignModal(false);
      setModalConfirmed(false);
      fetchData();
      setSigRole('');
      setSigComment('');
    } catch (err) {
      toast.error(err.message || 'Failed to apply signature');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSendToReview = async (e) => {
    e.preventDefault();
    setIsSendingWithoutSig(true);
    try {
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        sendWithoutSignature: true,
        comment: sigComment
      });
      toast.success('Logsheet sent to review without signature');
      navigate('/logsheet/waiting-signature');
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSendingWithoutSig(false);
    }
  };

  const handleFinalizeApplicationSuccessful = async () => {
    if (totalSignedCount < 3) {
      toast.error(`Requires at least 3 of 4 committee signatures — currently ${totalSignedCount}/4 signed.`);
      return;
    }

    const isConfirmed = window.confirm('Are you sure you want to mark this application as Successful and complete committee sign-off?');
    if (!isConfirmed) return;

    setIsFinalizing(true);
    try {
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true
      });

      toast.success('🎉 Application marked Successful! Committee Signatures finalized and ready for Certificate.');
      fetchData();
      navigate('/logsheet/waiting-certificate');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to finalize application');
    } finally {
      setIsFinalizing(false);
    }
  };

  const openApproveProductsModal = () => {
    if (totalSignedCount < 3) {
      toast.error(`Requires at least 3 of 4 committee signatures — currently ${totalSignedCount}/4 signed.`);
      return;
    }
    const productsList = isInitialProduct
      ? (application?.product ? [application.product] : [])
      : (application?.products || clientProducts || []);
    // Default all products selected
    setSelectedApproveProducts(productsList.map((_, idx) => idx));
    setShowApproveProductsModal(true);
  };

  const handleSendHighlightedProductsToClient = async () => {
    const productsList = isInitialProduct
      ? (application?.product ? [application.product] : [])
      : (application?.products || clientProducts || []);
    if (productsList.length > 0 && selectedApproveProducts.length === 0) {
      toast.error('Please select at least one product to approve.');
      return;
    }

    const countToApprove = selectedApproveProducts.length > 0 ? selectedApproveProducts.length : productsList.length;
    const isConfirmed = window.confirm(
      isInitialProduct
        ? 'Are you sure you want to approve this Initial Product and send for facility audit?'
        : `Are you sure you want to approve and send ${countToApprove} highlighted product(s) to the client dashboard?`
    );
    if (!isConfirmed) return;

    setIsFinalizing(true);
    try {
      const approvedProductsList = productsList.length > 0 && selectedApproveProducts.length > 0
        ? productsList.filter((_, idx) => selectedApproveProducts.includes(idx))
        : productsList;

      // 1. Finalize logsheet sign-off with approved products
      await api.put(`/api/application-logsheets/${currentLogsheet._id}/sign`, {
        finalizeSignOff: true,
        approved_products: approvedProductsList
      });

      // 2. If Initial Product, call initial-products approve-form
      if (isInitialProduct) {
        const targetIpId = resolvedInitialProductId || currentLogsheet?.initial_product_application_id?._id || currentLogsheet?.initial_product_application_id;
        if (targetIpId) {
          try {
            await api.put(`/api/initial-products/${targetIpId}/approve-form`);
          } catch (e) {
            console.warn('Initial product approve-form sync note:', e.message);
          }
        }
      }

      // 3. Also call add-on approve-form if linked
      const targetAddonId = addonId || currentLogsheet?.addon_application_id?._id || currentLogsheet?.addon_application_id;
      if (targetAddonId) {
        try {
          await api.put(`/api/add-on-applications/${targetAddonId}/approve-form`, {
            approved_products: approvedProductsList
          });
        } catch (e) {
          console.warn('Add-on approve-form sync note:', e.message);
        }
      }

      toast.success(
        isInitialProduct
          ? '🎉 Initial Product Approved! Main Application is now ready for Audit.'
          : `🎉 ${approvedProductsList.length} product(s) approved successfully!`
      );
      setShowApproveProductsModal(false);
      fetchData();
      if (isInitialProduct) {
        navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`);
      } else {
        navigate('/logsheet/waiting-certificate');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to approve products');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validate Tab 1: Company & Site Details
    if (!form.company_name?.trim()) {
      toast.error('Company Name is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.contact_person?.trim()) {
      toast.error('Contact Person is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.company_address?.trim()) {
      toast.error('Company Address is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.manufacturing_address?.trim()) {
      toast.error('Manufacturing Site Address is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.contact_email?.trim()) {
      toast.error('Contact Email is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.nature_of_business?.trim()) {
      toast.error('Nature of Business is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.product_category?.trim()) {
      toast.error('Product Category is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.issue_date) {
      toast.error('Issue Date of Certificate is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.expiry_date) {
      toast.error('Expiry Date of Certificate is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.current_cycle_start) {
      toast.error('Current Cycle Start Date is required (Tab 1)');
      setActiveTab(1);
      return;
    }
    if (!form.original_cycle_start) {
      toast.error('Original Cycle Start Date is required (Tab 1)');
      setActiveTab(1);
      return;
    }

    const hasAuditReports = (form.document_urls && form.document_urls.length > 0) || form.document_url || (form.audit_reports && form.audit_reports.length > 0);
    if (!isAddon && !isInitialProduct && !hasAuditReports) {
      toast.error('Please upload at least 1 Audit Report document before creating the logsheet (Tab 1).');
      setActiveTab(1);
      return;
    }

    // 2. Validate Tab 2: Review of Application
    if (!form.audit_type?.trim()) {
      toast.error('Audit Type is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.audit_date) {
      toast.error('Audit Date is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.auditors?.trim()) {
      toast.error((isAddon || isInitialProduct) ? 'Assigned FT is required (Tab 2)' : 'Auditor(s) are required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!isAddon && !isInitialProduct && !form.ncs_close?.trim()) {
      toast.error('NCS Close status is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.docs_satisfactory?.trim()) {
      toast.error('Documentation Review Status is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.pork_free_statement?.trim()) {
      toast.error('Pork Free Statement is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.reviewed_by?.trim()) {
      toast.error('Reviewed By is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.reviewer_name?.trim()) {
      toast.error('Reviewer Name is required (Tab 2)');
      setActiveTab(2);
      return;
    }
    if (!form.review_date) {
      toast.error('Date of Review is required (Tab 2)');
      setActiveTab(2);
      return;
    }

    // 3. Validate Tab 3: Certificate Status
    if (!form.status_date) {
      toast.error('Status Date is required (Tab 3)');
      setActiveTab(3);
      return;
    }

    // 4. Validate Tab 4: Comment
    if (!form.comment?.trim()) {
      toast.error('Comment / Reason for Decision is required (Tab 4)');
      setActiveTab(4);
      return;
    }

    // 5. Confirmation
    if (!form.confirmed) {
      toast.error('Please confirm the verification checkbox at the bottom');
      return;
    }

    setSubmitting(true);
    try {
      if (isInitialProduct) {
        await api.post(`/api/initial-products/${resolvedInitialProductId}/create-logsheet`, {
          ...form,
          document_urls: form.document_urls || [],
          audit_reports: form.audit_reports || form.document_urls || [],
          client_id: application?.client_id?._id || application?.client_id,
        });
        toast.success('Logsheet created for Initial Product!');
        navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`);
      } else if (isAddon) {
        // For add-on applications — use the dedicated add-on logsheet route
        await api.post(`/api/add-on-applications/${addonId}/create-logsheet`, {
          ...form,
          document_urls: form.document_urls || [],
          audit_reports: form.audit_reports || form.document_urls || [],
          client_id: application?.client_id?._id || application?.client_id,
        });
        toast.success('Logsheet created for add-on application!');
        navigate('/addon-applications');
      } else {
        await api.post('/api/application-logsheets', {
          ...form,
          document_urls: form.document_urls || [],
          audit_reports: form.audit_reports || form.document_urls || [],
          application_id: application.id || application._id,
          client_id: application.client_id,
          site_id: application.site_id
        });
        toast.success('Logsheet saved and status updated successfully');
        navigate('/applications');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save logsheet');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = !!currentLogsheet;

  // Signatory calculations
  const signatories = [
    { roleKey: 'Mufti', label: 'Mufti / Shariah Signatory', signature: currentLogsheet?.mufti_signature, name: currentLogsheet?.mufti_sign_name, date: currentLogsheet?.mufti_sign_date },
    { roleKey: 'Ceo', label: 'CEO / Executive Signatory', signature: currentLogsheet?.ceo_signature, name: currentLogsheet?.ceo_sign_name, date: currentLogsheet?.ceo_sign_date },
    { roleKey: 'Manager', label: 'Manager / Technical Signatory', signature: currentLogsheet?.manager_signature, name: currentLogsheet?.manager_sign_name, date: currentLogsheet?.manager_sign_date },
    { roleKey: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', signature: currentLogsheet?.mufti2_signature, name: currentLogsheet?.mufti2_sign_name, date: currentLogsheet?.mufti2_sign_date },
  ];

  const totalSignedCount = signatories.filter(s => !!s.signature).length;
  const isFullySigned = totalSignedCount === 4 || currentLogsheet?.status === 'Signed' || currentLogsheet?.status === 'Completed';

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => isInitialProduct ? navigate(`/admin/initial-products/${resolvedInitialProductId}/processing`) : navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <ChevronLeft size={16} /> {isInitialProduct ? 'Back to Initial Product' : 'Back'}
        </button>

        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {isInitialProduct ? 'Initial Product Ref:' : 'Application Ref:'} <strong style={{ color: '#0f172a' }}>#{isInitialProduct ? (application?.product?.name || application?._id?.slice(-6)?.toUpperCase() || 'INITIAL-PRODUCT') : (application?.application_number || 'N/A')}</strong>
        </div>
      </div>

      {/* OVERALL SIGNING PROGRESS HEADER BANNER */}
      {isReadOnly && (
        <div style={{
          background: isFullySigned ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)',
          border: `1px solid ${isFullySigned ? '#bbf7d0' : '#fed7aa'}`,
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: isFullySigned ? '#dcfce7' : '#ffedd5',
                color: isFullySigned ? '#16a34a' : '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isFullySigned ? <ShieldCheck size={24} /> : <Clock size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isFullySigned ? '#14532d' : '#9a3412' }}>
                  {isFullySigned ? 'Fully Executed Halal Certification Logsheet' : 'Logsheet Sign-Off Review in Progress'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: isFullySigned ? '#166534' : '#c2410c' }}>
                  {isFullySigned
                    ? 'All committee signatures have been verified and sealed on this decision record.'
                    : `${totalSignedCount} of 4 committee signatories have signed this document.`}
                </p>
              </div>
            </div>

            {/* Header Signing Action if pending */}
            {!isFullySigned && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => openSigningModal()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 16px', boxShadow: '0 2px 4px rgba(21,128,61,0.2)' }}
                >
                  <PenTool size={14} /> Apply My Signature
                </button>
              </div>
            )}
          </div>

          {/* Quick 4-step signatory status line */}
          <div style={{ borderTop: `1px solid ${isFullySigned ? '#dcfce7' : '#fed7aa'}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: isFullySigned ? '#15803d' : '#9a3412', letterSpacing: '0.05em', marginBottom: 6 }}>
              Committee Signatory Roster (Minimum 3 Signatures to Complete Review)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 4 }}>
              {signatories.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: s.signature ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  borderRadius: 8,
                  border: `1px solid ${s.signature ? (isFullySigned ? '#86efac' : '#fed7aa') : '#e2e8f0'}`,
                  fontSize: 12
                }}>
                  {s.signature ? (
                    <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: s.signature ? '#0f172a' : '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {s.label.split('/')[0].trim()}
                    </div>
                    <div style={{ fontSize: 11, color: s.signature ? '#15803d' : '#94a3b8' }}>
                      {s.signature ? (s.name || 'Signed') : 'Awaiting'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT-STYLE PRESENTATION CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' }}>

        {/* Official Document Header - Bright Modern HFA Emerald Theme */}
        <div style={{ background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)', color: 'white', padding: '24px 30px', borderBottom: '1px solid #0f766e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8, border: '1px solid rgba(255,255,255,0.3)' }}>
                <CheckSquare size={12} /> OFFICIAL CERTIFICATION DECISION RECORD
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {isProductLogsheet ? 'Halal Product Certification Logsheet' : 'Halal Certification Audit Logsheet'}
              </h2>
              <p style={{ fontSize: 13, color: '#d1fae5', margin: '4px 0 0' }}>
                Halal Food Authority — Technical &amp; Shariah Committee Decision File
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#d1fae5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{isInitialProduct ? 'Product Reference' : 'Application Reference'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                #{isInitialProduct ? (application?.product?.name || application?._id?.slice(-6)?.toUpperCase() || 'INITIAL-PRODUCT') : (application?.application_number || 'N/A')}
              </div>
              <div style={{ fontSize: 12, color: '#ccfbf1', marginTop: 2 }}>
                {isProductLogsheet ? 'Evaluation Type:' : 'Audit Type:'} <strong>{form.audit_type || (isInitialProduct ? 'Initial Product Evaluation' : 'New')}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation if creating or editing */}
        {!isReadOnly && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            {[
              { id: 1, label: '1. Company & Site Details', icon: Building },
              { id: 2, label: '2. Review of Application', icon: FileText },
              { id: 3, label: '3. Certificate Status', icon: Award },
              { id: 4, label: '4. Comment / Reason', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary)' : '#64748b',
                    background: isActive ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* UNIFIED READ-ONLY DOCUMENT VIEW */}
        {isReadOnly ? (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Section 1: Company & Site Details */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Building size={16} style={{ color: '#047857' }} />
                1. Site &amp; Company Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Site Name</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
                    {form.site_name || application?.site_id?.name || application?.site_name || 'Main Manufacturing Site'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Name</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{form.company_name || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Person</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{form.contact_person || '—'}</div>
                  <div style={{ fontSize: 12, color: '#047857', fontWeight: 500, marginTop: 1 }}>{form.contact_email || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Registered Address</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3, fontWeight: 500 }}>{form.company_address || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manufacturing Site Address</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3, fontWeight: 500 }}>{form.manufacturing_address || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nature of Business</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.nature_of_business || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Category</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.product_category || '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 2: Certification Validity & Cycle Dates */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Calendar size={16} style={{ color: '#047857' }} />
                2. Certification Validity &amp; Cycle Dates
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certificate Issue Date</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#047857', marginTop: 3 }}>{form.issue_date ? new Date(form.issue_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certificate Expiry Date</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginTop: 3 }}>{form.expiry_date ? new Date(form.expiry_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Cycle Start Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.current_cycle_start ? new Date(form.current_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original Cycle Start Date</div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 3 }}>{form.original_cycle_start ? new Date(form.original_cycle_start).toLocaleDateString('en-GB') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 3: Audit & Technical Compliance Review */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <FileText size={16} style={{ color: '#047857' }} />
                3. Audit &amp; Technical Compliance Review
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Type</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', marginTop: 3 }}>{form.audit_type || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Date</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.audit_date ? new Date(form.audit_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{isAddon ? 'FT(s) Assigned' : 'Auditor(s) Assigned'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.auditors || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Non-Conformances (NCS Close)</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.ncs_close?.toLowerCase().includes('closed') || form.ncs_close?.toLowerCase().includes('no') ? '#15803d' : '#b45309', marginTop: 3 }}>
                    {form.ncs_close || (isAddon ? 'N/A - Product Evaluation' : 'No NCs Flagged')}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documentation Review Status</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 3 }}>{form.docs_satisfactory || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pork Free Policy Statement</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginTop: 3 }}>{form.pork_free_statement || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviewed By (Role / Dept)</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.reviewed_by || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviewer Name</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.reviewer_name || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date of Review</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>{form.review_date ? new Date(form.review_date).toLocaleDateString('en-GB') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Section 4: Certificate Status & Scope Checks */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <Award size={16} style={{ color: '#047857' }} />
                4. Scope &amp; Certificate Status Checks
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'Annual Certificate', val: form.annual_certificate },
                  { label: 'Batch Certificate', val: form.batch_certificate },
                  { label: 'Only Addition of New Products', val: form.new_products_only },
                  { label: 'Addition of New Site / Line', val: form.new_site_line },
                  { label: 'New Client Application', val: form.new_client },
                  { label: 'Certification Agreement Signed', val: form.agreement_signed },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{item.label}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: item.val === 'Yes' ? '#dcfce7' : '#f1f5f9',
                      color: item.val === 'Yes' ? '#15803d' : '#64748b',
                      border: `1px solid ${item.val === 'Yes' ? '#bbf7d0' : '#e2e8f0'}`
                    }}>
                      {item.val || 'No'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status Effective Date:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{form.status_date ? new Date(form.status_date).toLocaleDateString('en-GB') : '—'}</span>
              </div>
            </div>

            {/* Section 5: Committee Comments & Recommendation Notes */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <MessageSquare size={16} style={{ color: '#047857' }} />
                5. Committee Comments &amp; Recommendation Notes
              </h4>
              <div style={{
                background: '#f8fafc',
                padding: '16px 20px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 13.5,
                color: form.comment ? '#1e293b' : '#64748b',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontStyle: form.comment ? 'normal' : 'italic'
              }}>
                {form.comment || 'No additional committee notes or conditions recorded.'}
              </div>
            </div>

            {/* Section 6: Attached Audit Reports OR Filled Product Approval Request Forms */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <FileText size={16} style={{ color: '#047857' }} />
                {isProductLogsheet ? '6. Filled Product Approval Request Forms & Declarations' : '6. Attached Audit Reports'}
              </h4>

              {isProductLogsheet ? (
                <div>
                  <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>
                    Official client-submitted 3-page Halal Certification Product Approval Request Forms with full ingredient declarations, porcine segregation checks, and technical sign-offs:
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                    {(isInitialProduct ? (application?.product ? [application.product] : []) : (application?.products || [])).map((p, pIdx) => {
                      const resp = isInitialProduct
                        ? (application?.product_approval_form?.product_response || {})
                        : (application?.product_approval_form?.product_responses || []).find(r => r.product_index === pIdx);
                      const isSaved = resp?.is_saved || Boolean(resp?.response_url) || (resp?.form_data && Object.keys(resp.form_data).length > 0);
                      const formData = resp?.form_data || {};

                      return (
                        <div
                          key={pIdx}
                          style={{
                            background: '#f8fafc',
                            border: `1.5px solid ${isSaved ? '#bbf7d0' : '#e2e8f0'}`,
                            borderRadius: 10,
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: 8,
                              background: isSaved ? '#dcfce7' : '#f1f5f9',
                              color: isSaved ? '#166534' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 13
                            }}>
                              #{pIdx + 1}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                {p.name} {p.code ? `(${p.code})` : ''}
                              </div>
                              <div style={{ fontSize: 11.5, color: isSaved ? '#15803d' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {isSaved ? (
                                  <>
                                    <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                                    <span>Form Completed &amp; Signed by Client ({formData.print_name || 'Signatory'})</span>
                                  </>
                                ) : (
                                  <span>Awaiting Client Form Completion</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                background: '#164e63',
                                borderColor: '#164e63',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                fontWeight: 700
                              }}
                              onClick={() => setViewProductModal({
                                isOpen: true,
                                formData: formData && Object.keys(formData).length > 0 ? formData : {
                                  product_name: p.name,
                                  product_code: p.code,
                                  company_name_address: form.company_name
                                },
                                product: p,
                                company: application?.client_id
                              })}
                            >
                              <Eye size={14} /> View Filled Product Form
                            </button>

                            {resp?.response_url && (
                              <a
                                href={getPdfUrl(resp.response_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                              >
                                <Download size={13} /> Attached PDF
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {Array.isArray(form.document_urls) && form.document_urls.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Additional Supporting Documents:</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {form.document_urls.map((doc, idx) => (
                          <a key={idx} href={getPdfUrl(doc.url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <Download size={13} /> {doc.name || `Document_${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                    form.document_urls.map((doc, idx) => (
                      <a
                        key={idx}
                        href={getPdfUrl(doc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontWeight: 600 }}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          const fullUrl = getPdfUrl(doc.url);
                          if (fullUrl && fullUrl !== '#') {
                            window.open(fullUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <Download size={14} style={{ color: '#047857' }} /> {doc.name || `Audit Report Document ${idx + 1}`}
                      </a>
                    ))
                  ) : form.document_url ? (
                    <a
                      href={getPdfUrl(form.document_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontWeight: 600 }}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fullUrl = getPdfUrl(form.document_url);
                        if (fullUrl && fullUrl !== '#') {
                          window.open(fullUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <Download size={14} style={{ color: '#047857' }} /> Audit Report Document
                    </a>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                      No audit report files attached.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION F: FORMAL SIGNATURE MATRIX BLOCK */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PenTool size={18} style={{ color: 'var(--primary)' }} />
                    Committee Signatures
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Official digital signatures applied by authorized Shariah &amp; Management signatories.
                  </p>
                </div>
                {totalSignedCount < 4 && (
                  <button
                    onClick={() => openSigningModal()}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <PenTool size={14} /> Add Signature
                  </button>
                )}
              </div>

              {/* 4-Role Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {signatories.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: `1.5px solid ${s.signature ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: 16,
                      background: s.signature ? '#f0fdf4' : '#fafafa',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 170
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.signature ? '#166534' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {s.label}
                        </span>
                        {s.signature ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>
                            <Check size={12} /> Signed
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                            Pending
                          </span>
                        )}
                      </div>

                      {s.signature ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 50, marginBottom: 8 }}>
                            <img
                              src={getPdfUrl(s.signature)}
                              alt={`${s.label} Signature`}
                              style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{s.name || 'Authorised Signatory'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #cbd5e1', borderRadius: 6, margin: '8px 0', background: '#fff' }}>
                          <PenTool size={18} style={{ color: '#94a3b8', marginBottom: 4 }} />
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Awaiting Signature</span>
                        </div>
                      )}
                    </div>

                    {!s.signature && (
                      <div style={{ marginTop: 8 }}>
                        {isMuftiUser && (s.roleKey === 'Ceo' || s.roleKey === 'Manager') ? (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.5, cursor: 'not-allowed', background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}
                            title="Mufti signatories cannot sign for CEO or Technical Manager roles"
                          >
                            Restricted (Mufti)
                          </button>
                        ) : userSignature ? (
                          <button
                            type="button"
                            onClick={() => openSigningModal(s.roleKey)}
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                          >
                            <PenTool size={13} /> Sign as {s.roleKey}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: 11, padding: '6px 10px', opacity: 0.6 }}
                            title="Upload signature in Signatures page first"
                          >
                            Sign as {s.roleKey}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mark as Done Action Block */}
              {currentLogsheet?.status !== 'Waiting For Certificate' && currentLogsheet?.status !== 'Signed' && currentLogsheet?.status !== 'Completed' && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: totalSignedCount >= 3 ? '#f0fdf4' : '#fffbeb',
                    borderRadius: 10,
                    border: `1.5px solid ${totalSignedCount >= 3 ? '#bbf7d0' : '#fde68a'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: totalSignedCount >= 3 ? '#14532d' : '#92400e' }}>
                      {totalSignedCount >= 3 ? 'Committee Review & Signatures Ready' : 'Signature Threshold Pending'}
                    </div>
                    <div style={{ fontSize: 12, color: totalSignedCount >= 3 ? '#166534' : '#b45309', marginTop: 2 }}>
                      {totalSignedCount >= 3
                        ? ((isProductLogsheet || currentLogsheet?.source_type === 'initial_product_application' || currentLogsheet?.source_type === 'addon_application' || !!currentLogsheet?.addon_application_id || !!currentLogsheet?.initial_product_application_id || form.audit_type?.toLowerCase().includes('product') || form.audit_type?.toLowerCase().includes('add-on') || form.audit_type?.toLowerCase().includes('addon'))
                            ? `${totalSignedCount} of 4 committee signatures collected. Click "Approve Product" to complete review and approve product for client.`
                            : `${totalSignedCount} of 4 committee signatures collected. Click "Application Successful" to complete committee sign-off and advance application.`)
                        : `Requires at least 3 of 4 signatures — currently ${totalSignedCount}/4 signed.`}
                    </div>
                  </div>

                  {(isProductLogsheet || currentLogsheet?.source_type === 'initial_product_application' || currentLogsheet?.source_type === 'addon_application' || !!currentLogsheet?.addon_application_id || !!currentLogsheet?.initial_product_application_id || form.audit_type?.toLowerCase().includes('product') || form.audit_type?.toLowerCase().includes('add-on') || form.audit_type?.toLowerCase().includes('addon')) ? (
                    <button
                      onClick={openApproveProductsModal}
                      disabled={isFinalizing || totalSignedCount < 3}
                      className="btn btn-primary"
                      style={{
                        background: totalSignedCount >= 3 ? 'linear-gradient(135deg, #15803d, #16a34a)' : '#cbd5e1',
                        borderColor: totalSignedCount >= 3 ? '#15803d' : '#cbd5e1',
                        color: totalSignedCount >= 3 ? '#fff' : '#64748b',
                        fontWeight: 800,
                        padding: '10px 22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 10,
                        boxShadow: totalSignedCount >= 3 ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                        cursor: totalSignedCount >= 3 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isFinalizing ? <span className="spinner-white" /> : <><CheckCircle2 size={16} strokeWidth={2.5} /> {isInitialProduct ? 'Approve Initial Product' : 'Approve Product'}</>}
                    </button>
                  ) : (
                    <button
                      onClick={handleFinalizeApplicationSuccessful}
                      disabled={isFinalizing || totalSignedCount < 3}
                      className="btn btn-primary"
                      style={{
                        background: totalSignedCount >= 3 ? 'linear-gradient(135deg, #15803d, #16a34a)' : '#cbd5e1',
                        borderColor: totalSignedCount >= 3 ? '#15803d' : '#cbd5e1',
                        color: totalSignedCount >= 3 ? '#fff' : '#64748b',
                        fontWeight: 800,
                        padding: '10px 22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 10,
                        boxShadow: totalSignedCount >= 3 ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                        cursor: totalSignedCount >= 3 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isFinalizing ? <span className="spinner-white" /> : <><CheckCircle2 size={16} strokeWidth={2.5} /> Application Successful</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* FORM VIEW FOR CREATING NEW LOGSHEET */
          <form onSubmit={handleSubmit} style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {activeTab === 1 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Auto-populated Indicator Banner */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, gridColumn: '1 / -1', marginBottom: 4 }}>
                  <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>
                    <strong>Site &amp; Company Details Auto-Populated:</strong> Core business identifiers (Site Name, Company Name, Contact Person) are locked from the verified application record.
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Site Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="text"
                    className="form-control"
                    value={form.site_name || application?.site_id?.name || application?.site_name || application?.establishment_name || 'Main Manufacturing Site'}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="text"
                    className="form-control"
                    value={form.company_name || ''}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Contact Person <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="text"
                    className="form-control"
                    value={form.contact_person || ''}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Company Address <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="text"
                    className="form-control"
                    value={form.company_address || ''}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 600 }}
                    placeholder="Registered company address"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Manufacturing Site Address <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="text"
                    className="form-control"
                    value={form.manufacturing_address || ''}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 600 }}
                    placeholder="Manufacturing site address"
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Contact E-mail <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="email"
                    className="form-control"
                    value={form.contact_email || ''}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 600 }}
                    placeholder="name@company.com"
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Nature of the business <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  <input
                    required
                    readOnly
                    type="text"
                    className="form-control"
                    value={form.nature_of_business || ''}
                    style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 600 }}
                    placeholder="e.g. Halal Food Production"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Product Category <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="text" className="form-control" value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} placeholder="e.g. Category C - Food Manufacturing" />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue date of certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.issue_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry date of certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.expiry_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Cycle Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.current_cycle_start?.split('T')[0] || ''} onChange={e => setForm({ ...form, current_cycle_start: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Original Cycle Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.original_cycle_start?.split('T')[0] || ''} onChange={e => setForm({ ...form, original_cycle_start: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  {isProductLogsheet ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', margin: 0 }}>
                          Client Product Approval Request Forms &amp; Specifications
                        </label>
                        <span className="badge badge-teal" style={{ fontSize: 11, fontWeight: 700 }}>
                          {isInitialProduct ? '1 PRODUCT IN INITIAL EVALUATION' : `${application?.products?.length || 0} PRODUCTS IN ADD-ON`}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                        Official 3-page Halal Certification Product Approval Request Forms submitted by the client (Ingredients, Porcine Segregation, Processing Aids, Ethanol, Packaging specs &amp; Signatures).
                      </div>

                      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                        {(isInitialProduct ? (application?.product ? [application.product] : []) : (application?.products || [])).map((p, pIdx) => {
                          const resp = isInitialProduct
                            ? (application?.product_approval_form?.product_response || {})
                            : (application?.product_approval_form?.product_responses || []).find(r => r.product_index === pIdx);
                          const isSaved = resp?.is_saved || Boolean(resp?.response_url) || (resp?.form_data && Object.keys(resp.form_data).length > 0);
                          const formData = resp?.form_data || {};

                          return (
                            <div key={pIdx} style={{ background: '#fff', border: `1.5px solid ${isSaved ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: isSaved ? '#dcfce7' : '#f1f5f9', color: isSaved ? '#166534' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                                  #{pIdx + 1}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                    {p.name} {p.code ? `(${p.code})` : ''}
                                  </div>
                                  <div style={{ fontSize: 11, color: isSaved ? '#16a34a' : '#94a3b8' }}>
                                    {isSaved ? '✓ Form Filled & Signed by Client' : 'Awaiting Client Form Completion'}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ background: '#164e63', borderColor: '#164e63', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                onClick={() => setViewProductModal({
                                  isOpen: true,
                                  formData: formData && Object.keys(formData).length > 0 ? formData : {
                                    product_name: p.name,
                                    product_code: p.code,
                                    company_name_address: form.company_name
                                  },
                                  product: p,
                                  company: application?.client_id
                                })}
                              >
                                <Eye size={13} /> View Filled Product Form
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 12 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
                          <UploadCloud size={14} /> Attach Additional Product Specifications (Optional)
                          <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: 0 }}>
                          Upload Audit Reports <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: uploadingReport ? '#94a3b8' : 'var(--primary)', fontWeight: 600, cursor: uploadingReport ? 'not-allowed' : 'pointer' }}>
                          <UploadCloud size={14} /> {uploadingReport ? 'Uploading...' : 'Add Audit Reports'}
                          <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                        </label>
                      </div>

                      {Array.isArray(form.document_urls) && form.document_urls.length > 0 ? (
                        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                          {form.document_urls.map((doc, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} color="#16a34a" />
                                <a href={getPdfUrl(doc.url)} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                                  {doc.name || `Audit_Report_${idx + 1}.pdf`}
                                </a>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#dc2626', padding: '2px 8px' }}
                                onClick={() => {
                                  const updated = form.document_urls.filter((_, i) => i !== idx);
                                  setForm(f => ({
                                    ...f,
                                    document_urls: updated,
                                    document_url: updated[0]?.url || '',
                                    audit_reports: updated
                                  }));
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                            <UploadCloud size={14} /> + Upload another document
                            <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                          </label>
                        </div>
                      ) : form.document_url ? (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <a href={getPdfUrl(form.document_url)} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, flex: 1, textDecoration: 'none' }}>
                            Audit Report Uploaded Successfully
                          </a>
                          <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setForm({ ...form, document_url: '', document_urls: [], audit_reports: [] })}>Remove</button>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', padding: 22, alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: 10, cursor: uploadingReport ? 'not-allowed' : 'pointer', background: '#fff' }}>
                          <UploadCloud size={26} color="#0d9488" style={{ marginBottom: 6 }} />
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                            {uploadingReport ? 'Uploading Documents...' : 'Click or Drag to Upload Audit Reports (Required)'}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Select 1 or more files (PDF, DOCX, PNG)</div>
                          <input type="file" multiple disabled={uploadingReport} style={{ display: 'none' }} onChange={handleFileChange} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Audit Type <span style={{ color: '#dc2626' }}>*</span></label>
                    <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} /> Auto-populated
                    </span>
                  </div>
                  {isProductLogsheet ? (
                    <input
                      required
                      readOnly
                      type="text"
                      className="form-control"
                      value={form.audit_type || (isInitialProduct ? 'Initial Product Evaluation' : 'Add-on Products Certification')}
                      style={{ backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 700 }}
                    />
                  ) : (
                    <select required className="form-control" value={form.audit_type} onChange={e => setForm({ ...form, audit_type: e.target.value })}>
                      <option value="New">New</option>
                      <option value="Surveillance">Surveillance</option>
                      <option value="Re-audit">Re-audit</option>
                      <option value="Add-on Product Review">Add-on Product Review</option>
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Audit Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" value={form.audit_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, audit_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>{isProductLogsheet ? 'FTs' : 'Auditors'} <span style={{ color: '#dc2626' }}>*</span></label>
                    {isProductLogsheet && (
                      <span style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Lock size={12} /> Assigned FT
                      </span>
                    )}
                  </div>
                  <input
                    required
                    readOnly={isProductLogsheet}
                    type="text"
                    className="form-control"
                    placeholder={isProductLogsheet ? 'Assigned Food Technologist(s)' : 'e.g. John Doe, Jane Smith'}
                    value={form.auditors || ''}
                    onChange={e => setForm({ ...form, auditors: e.target.value })}
                    style={isProductLogsheet ? { backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: 700 } : {}}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    NCS Close (if any) {!isProductLogsheet && <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  <input
                    required={!isProductLogsheet}
                    type="text"
                    className="form-control"
                    value={form.ncs_close || ''}
                    onChange={e => setForm({ ...form, ncs_close: e.target.value })}
                    placeholder={isProductLogsheet ? 'e.g. N/A - Product Evaluation (Optional)' : 'e.g. No NCs flagged / All NCs closed'}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Audit Documentation reviewed and found satisfactory <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="text" className="form-control" value={form.docs_satisfactory} onChange={e => setForm({ ...form, docs_satisfactory: e.target.value })} placeholder="e.g. Satisfactory - all documentation verified" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Pork free statement / signed pork policy submitted <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="text" className="form-control" value={form.pork_free_statement} onChange={e => setForm({ ...form, pork_free_statement: e.target.value })} placeholder="e.g. Confirmed - signed pork-free declaration in place" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reviewed By <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="text" className="form-control" value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} placeholder="e.g. HFA Technical Committee" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reviewer Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="text" className="form-control" value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} placeholder="e.g. Lead Technical Reviewer" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Date of Review <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" style={{ maxWidth: 300 }} value={form.review_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, review_date: e.target.value })} />
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Annual certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.annual_certificate} onChange={e => setForm({ ...form, annual_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch certificate <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.batch_certificate} onChange={e => setForm({ ...form, batch_certificate: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Only addition of new products <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_products_only} onChange={e => setForm({ ...form, new_products_only: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Addition of new site (or line) <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_site_line} onChange={e => setForm({ ...form, new_site_line: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">New Client <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.new_client} onChange={e => setForm({ ...form, new_client: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agreement Signed <span style={{ color: '#dc2626' }}>*</span></label>
                  <select required className="form-control" value={form.agreement_signed} onChange={e => setForm({ ...form, agreement_signed: e.target.value })}>
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Status Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input required type="date" className="form-control" style={{ maxWidth: 300 }} value={form.status_date?.split('T')[0] || ''} onChange={e => setForm({ ...form, status_date: e.target.value })} />
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="form-group">
                <label className="form-label">Comment / Reason for Decision <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea
                  required
                  className="form-control"
                  rows={8}
                  style={{ fontSize: 14, padding: 14 }}
                  placeholder="Enter final review comments, conditions, or recommendations..."
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                />
              </div>
            )}

            {/* Bottom Footer Submit */}
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  I confirm that all product matrix and audit compliance details above have been verified. <span style={{ color: '#dc2626' }}>*</span>
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !form.confirmed}
                  style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
                >
                  {submitting ? 'Saving Logsheet...' : 'Create & Save Logsheet'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* INTERACTIVE SIGNATURE MODAL WITH DOUBLE-CONFIRMATION STEP */}
      {showSignModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {/* Modal Header - Emerald Gradient Theme */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={20} style={{ color: '#ffffff' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Apply Committee Electronic Signature</h3>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Step 1: Select Single Role */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    1. Select Signatory Role to Execute (Sign One by One)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    Single Role Sign
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'Mufti', label: 'Mufti / Shariah Signatory', isSigned: Boolean(currentLogsheet?.mufti_signature) },
                    { key: 'Ceo', label: 'CEO / Executive Signatory', isSigned: Boolean(currentLogsheet?.ceo_signature) },
                    { key: 'Manager', label: 'Manager (Technical Auditor)', isSigned: Boolean(currentLogsheet?.manager_signature) },
                    { key: 'Mufti2', label: 'Mufti 2 / Secondary Shariah', isSigned: Boolean(currentLogsheet?.mufti2_signature) },
                  ].map(r => {
                    const isSelected = sigRole === r.key;
                    const isAlreadySigned = r.isSigned;
                    const isRestrictedForMufti = isMuftiUser && (r.key === 'Ceo' || r.key === 'Manager');
                    const isDisabled = isAlreadySigned || isRestrictedForMufti;

                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setSigRole(r.key);
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${isDisabled ? '#e2e8f0' : isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                          background: isAlreadySigned ? '#f1f5f9' : isRestrictedForMufti ? '#fef2f2' : isSelected ? '#f0fdf4' : '#f8fafc',
                          color: isAlreadySigned ? '#94a3b8' : isRestrictedForMufti ? '#991b1b' : isSelected ? 'var(--primary-dark)' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 13,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: isDisabled ? 0.6 : 1,
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: isSelected ? 800 : 600 }}>{r.label}</div>
                          {isAlreadySigned && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>(Already Signed)</span>}
                          {isRestrictedForMufti && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>(Mufti Restricted)</span>}
                        </div>
                        {isSelected && !isDisabled && (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={12} />
                          </div>
                        )}
                        {isAlreadySigned && <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Signature Preview */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  2. Authenticated Digital Signature Preview
                </label>
                {userSignature ? (
                  <div style={{ padding: '14px 18px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>AUTHENTICATED USER</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{userSignature.name}</div>
                    </div>
                    <img
                      src={getPdfUrl(userSignature.signature_url)}
                      alt="Digital Signature"
                      style={{ maxHeight: 42, maxWidth: 140, objectFit: 'contain', background: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
                    No digital signature image found for your account. Please upload one in the Signatures management page.
                  </div>
                )}
              </div>

              {/* Step 3: Optional Comment */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                  3. Signature Comment / Note (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Enter comments or conditions regarding this signature..."
                  value={sigComment}
                  onChange={e => setSigComment(e.target.value)}
                  style={{ fontSize: 13, padding: 10 }}
                />
              </div>

              {/* Step 4: EXPLICIT DOUBLE CONFIRMATION CHECKBOX */}
              <div style={{ padding: '12px 14px', background: modalConfirmed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${modalConfirmed ? '#86efac' : '#fed7aa'}`, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={modalConfirmed}
                    onChange={e => setModalConfirmed(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: modalConfirmed ? '#14532d' : '#9a3412' }}>
                    I explicitly confirm that I am applying my authorized electronic signature to this logsheet decision record.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSignModal(false)}
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmApplySignature}
                disabled={isSigning || !sigRole || !modalConfirmed || !userSignature}
                className="btn btn-primary"
                style={{
                  padding: '9px 24px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: (!modalConfirmed || isSigning || !sigRole || !userSignature) ? 0.6 : 1
                }}
              >
                {isSigning ? 'Applying Signature...' : 'Confirm & Apply Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD-ON ONLY: APPROVE CLIENT PRODUCTS MODAL ─── */}
      {showApproveProductsModal && (
        <div className="modal-overlay" style={{ zIndex: 1260 }} onClick={() => setShowApproveProductsModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 720, width: '95%', maxHeight: '90vh', padding: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <div className="modal-title" style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {isInitialProduct ? 'Initial Product Approved' : 'Approve Add-on Products'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {isInitialProduct
                      ? (application?.product?.name ? `${application.product.name} • Initial Product Halal Evaluation` : 'Initial Product Halal Evaluation')
                      : `${application?.profiles?.company_name || form.company_name} • Site: ${form.site_name || 'Main Site'}`}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowApproveProductsModal(false)} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, background: '#fafafa' }}>
              {/* Guidance Notice */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: '#166534' }}>
                  {isInitialProduct
                    ? 'Confirm committee approval for this Initial Product. Once approved and sent for audit, the Initial Product status will be marked as Initial Product Approved and the main facility application will unlock audit scheduling.'
                    : 'Select the verified products to approve. Highlighted products will be pushed to the client dashboard and approved for certification.'}
                </div>
              </div>

              {/* Selection Summary & Select All Toolbar */}
              {(() => {
                const productsList = isInitialProduct
                  ? (application?.product ? [application.product] : [])
                  : (application?.products || clientProducts || []);
                const allSelected = productsList.length > 0 && selectedApproveProducts.length === productsList.length;

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Products to Approve ({selectedApproveProducts.length} of {productsList.length} highlighted)
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (allSelected) {
                            setSelectedApproveProducts([]);
                          } else {
                            setSelectedApproveProducts(productsList.map((_, i) => i));
                          }
                        }}
                        style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', padding: '2px 8px' }}
                      >
                        {allSelected ? 'Deselect All' : 'Select All Products'}
                      </button>
                    </div>

                    {/* Products Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {productsList.map((p, idx) => {
                        const isSelected = selectedApproveProducts.includes(idx);
                        const resp = isInitialProduct
                          ? (application?.product_approval_form?.product_response || {})
                          : application?.product_approval_form?.product_responses?.find(r => r.product_index === idx);
                        const formData = resp?.form_data || {};
                        const isSaved = resp?.is_saved || Boolean(resp?.response_url) || Object.keys(formData).length > 0;

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedApproveProducts(prev =>
                                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 14,
                              padding: '14px 16px',
                              borderRadius: 12,
                              border: `2px solid ${isSelected ? '#16a34a' : '#e2e8f0'}`,
                              background: isSelected ? '#f0fdf4' : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(22, 163, 74, 0.12)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Handled by parent onClick
                                style={{ width: 18, height: 18, accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: isSelected ? '#16a34a' : '#f1f5f9',
                                  color: isSelected ? '#fff' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  flexShrink: 0
                                }}
                              >
                                #{idx + 1}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 13.5, color: isSelected ? '#14532d' : '#0f172a' }}>
                                  {p.name || p.title} {p.code ? `(${p.code})` : ''}
                                </div>
                                <div style={{ fontSize: 11.5, color: isSelected ? '#15803d' : '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                                    {p.type || 'Initial product'}
                                  </span>
                                  {isSaved ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#16a34a', fontWeight: 600 }}>
                                      <CheckCircle2 size={12} /> Form Signed
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>Awaiting Signatory</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* View Filled Form Link */}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewProductModal({
                                  isOpen: true,
                                  formData: formData && Object.keys(formData).length > 0 ? formData : {
                                    product_name: p.name,
                                    product_code: p.code,
                                    company_name_address: form.company_name
                                  },
                                  product: p,
                                  company: application?.client_id
                                });
                              }}
                              style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', padding: '4px 8px', flexShrink: 0 }}
                            >
                              <Eye size={13} style={{ marginRight: 4 }} /> View Form
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowApproveProductsModal(false)}
                disabled={isFinalizing}
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendHighlightedProductsToClient}
                disabled={isFinalizing || selectedApproveProducts.length === 0}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #15803d, #16a34a)',
                  borderColor: '#15803d',
                  color: '#fff',
                  fontWeight: 800,
                  padding: '10px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                  opacity: (isFinalizing || selectedApproveProducts.length === 0) ? 0.6 : 1
                }}
              >
                {isFinalizing ? (
                  <>
                    <span className="spinner-white" /> {isInitialProduct ? 'Sending for Audit...' : 'Sending to Client Dashboard...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                    {isInitialProduct ? 'Send for Audit' : 'Send highlighted products to client dashboard'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Approval Request Form Full 3-Page Modal Viewer */}
      <ProductApprovalModal
        isOpen={viewProductModal.isOpen}
        onClose={() => setViewProductModal(prev => ({ ...prev, isOpen: false }))}
        formData={viewProductModal.formData}
        product={viewProductModal.product}
        company={viewProductModal.company}
      />
    </div>
  );
}
