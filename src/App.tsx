import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import SalesDashboard from './pages/SalesDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import Review from './pages/Review';
import Products from './pages/Products';
import Collections from './pages/Collections';
import Inventory from './pages/Inventory';
import Warehouses from './pages/Warehouses';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Calendar from './pages/Calendar';
import Documents from './pages/Documents';
import Alerts from './pages/Alerts';
import Exceptions from './pages/Exceptions';
import KPIReports from './pages/KPIReports';
import BOM from './pages/BOM';
import Costing from './pages/Costing';
import Drops from './pages/Drops';
import Pricing from './pages/Pricing';
import Retailers from './pages/Retailers';
import Returns from './pages/Returns';
import Wholesale from './pages/Wholesale';
import LaunchPlanning from './pages/LaunchPlanning';
import RetailerEnablement from './pages/RetailerEnablement';
import ContentReadiness from './pages/ContentReadiness';
import Fulfillment from './pages/Fulfillment';
import Receiving from './pages/Receiving';
import Purchasing from './pages/Purchasing';
import Replenishment from './pages/Replenishment';
import Forecast from './pages/Forecast';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Integrations from './pages/Integrations';
import AuditLog from './pages/AuditLog';
import Rules from './pages/Rules';
import ExecutiveOverview from './pages/ExecutiveOverview';
import ProductCollectionDashboard from './pages/ProductCollectionDashboard';
import InventoryFulfillmentDashboard from './pages/InventoryFulfillmentDashboard';
import AlertsExceptionsDashboard from './pages/AlertsExceptionsDashboard';
import SkuEanBarcodes from './pages/SkuEanBarcodes';
import SizeFit from './pages/SizeFit';
import SustainabilityCompliance from './pages/SustainabilityCompliance';
import B2BPortal from './pages/B2BPortal';
import QuotesProformas from './pages/QuotesProformas';
import SalesReps from './pages/SalesReps';
import SalesAnalytics from './pages/SalesAnalytics';
import CampaignPlanner from './pages/CampaignPlanner';
import AssortmentMerchandising from './pages/AssortmentMerchandising';
import MarketingInsights from './pages/MarketingInsights';
import MarketingIntegrations from './pages/MarketingIntegrations';
import CustomerProfile from './pages/CustomerProfile';
import B2BTerms from './pages/B2BTerms';
import Service from './pages/Service';
import ProductionMRP from './pages/ProductionMRP';
import InventoryWarehouse from './pages/InventoryWarehouse';
import OrdersFulfillment from './pages/OrdersFulfillment';
import ReturnsRMA from './pages/ReturnsRMA';
import Omnichannel from './pages/Omnichannel';
import ForecastingAI from './pages/ForecastingAI';
import AutoPOProposals from './pages/AutoPOProposals';
import OpenToBuy from './pages/OpenToBuy';
import DeadStockMarkdown from './pages/DeadStockMarkdown';
import AllocationIntelligence from './pages/AllocationIntelligence';
import NextBestActions from './pages/NextBestActions';
import Invoicing from './pages/Invoicing';
import ARAP from './pages/ARAP';
import TaxesVAT from './pages/TaxesVAT';
import MultiCurrencyFX from './pages/MultiCurrencyFX';
import AccountingIntegrations from './pages/AccountingIntegrations';
import AuditTrail from './pages/AuditTrail';
import OrganizationSettings from './pages/OrganizationSettings';
import SystemSettings from './pages/SystemSettings';
import Security from './pages/Security';
import DataExports from './pages/DataExports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1C274C',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#28a745',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#dc3545',
              secondary: '#fff',
            },
            style: {
              background: '#fee',
              color: '#dc3545',
            },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={<Navigate to="/executive-overview" replace />}
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalesDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <Layout>
                  <FinanceDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute>
                <Layout>
                  <Review />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections"
            element={
              <ProtectedRoute>
                <Layout>
                  <Collections />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouses"
            element={
              <ProtectedRoute>
                <Layout>
                  <Warehouses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <Orders />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Customers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <Calendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <Documents />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Dashboard / KPIs Routes */}
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Alerts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exceptions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Exceptions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpi-reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <KPIReports />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Product Routes */}
          <Route
            path="/bom"
            element={
              <ProtectedRoute>
                <Layout>
                  <BOM />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/costing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Costing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/drops"
            element={
              <ProtectedRoute>
                <Layout>
                  <Drops />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Pricing />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Sales Routes */}
          <Route
            path="/retailers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Retailers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/returns"
            element={
              <ProtectedRoute>
                <Layout>
                  <Returns />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale"
            element={
              <ProtectedRoute>
                <Layout>
                  <Wholesale />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Marketing Routes */}
          <Route
            path="/launch-planning"
            element={
              <ProtectedRoute>
                <Layout>
                  <LaunchPlanning />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/retailer-enablement"
            element={
              <ProtectedRoute>
                <Layout>
                  <RetailerEnablement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/content-readiness"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContentReadiness />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Operations Routes */}
          <Route
            path="/fulfillment"
            element={
              <ProtectedRoute>
                <Layout>
                  <Fulfillment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/receiving"
            element={
              <ProtectedRoute>
                <Layout>
                  <Receiving />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchasing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Purchasing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/replenishment"
            element={
              <ProtectedRoute>
                <Layout>
                  <Replenishment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast"
            element={
              <ProtectedRoute>
                <Layout>
                  <Forecast />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Admin Routes */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute>
                <Layout>
                  <Roles />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <ProtectedRoute>
                <Layout>
                  <Integrations />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute>
                <Layout>
                  <AuditLog />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rules"
            element={
              <ProtectedRoute>
                <Layout>
                  <Rules />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Dashboards Routes */}
          <Route
            path="/executive-overview"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExecutiveOverview />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/product-collection-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProductCollectionDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory-fulfillment-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <InventoryFulfillmentDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalesDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <FinanceDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts-exceptions-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <AlertsExceptionsDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Product Routes */}
          <Route
            path="/sku-ean-barcodes"
            element={
              <ProtectedRoute>
                <Layout>
                  <SkuEanBarcodes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/size-fit"
            element={
              <ProtectedRoute>
                <Layout>
                  <SizeFit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sustainability-compliance"
            element={
              <ProtectedRoute>
                <Layout>
                  <SustainabilityCompliance />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Sales Routes */}
          <Route
            path="/b2b-portal"
            element={
              <ProtectedRoute>
                <Layout>
                  <B2BPortal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotes-proformas"
            element={
              <ProtectedRoute>
                <Layout>
                  <QuotesProformas />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-reps"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalesReps />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalesAnalytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Marketing Routes */}
          <Route
            path="/campaign-planner"
            element={
              <ProtectedRoute>
                <Layout>
                  <CampaignPlanner />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assortment-merchandising"
            element={
              <ProtectedRoute>
                <Layout>
                  <AssortmentMerchandising />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing-insights"
            element={
              <ProtectedRoute>
                <Layout>
                  <MarketingInsights />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing-integrations"
            element={
              <ProtectedRoute>
                <Layout>
                  <MarketingIntegrations />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Customer Experience Routes */}
          <Route
            path="/customer-profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomerProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/b2b-terms"
            element={
              <ProtectedRoute>
                <Layout>
                  <B2BTerms />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/service"
            element={
              <ProtectedRoute>
                <Layout>
                  <Service />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Operations Routes */}
          <Route
            path="/production-mrp"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProductionMRP />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory-warehouse"
            element={
              <ProtectedRoute>
                <Layout>
                  <InventoryWarehouse />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders-fulfillment"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrdersFulfillment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/returns-rma"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReturnsRMA />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/omnichannel"
            element={
              <ProtectedRoute>
                <Layout>
                  <Omnichannel />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Planning & Intelligence Routes */}
          <Route
            path="/forecasting-ai"
            element={
              <ProtectedRoute>
                <Layout>
                  <ForecastingAI />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auto-po-proposals"
            element={
              <ProtectedRoute>
                <Layout>
                  <AutoPOProposals />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/open-to-buy"
            element={
              <ProtectedRoute>
                <Layout>
                  <OpenToBuy />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dead-stock-markdown"
            element={
              <ProtectedRoute>
                <Layout>
                  <DeadStockMarkdown />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/allocation-intelligence"
            element={
              <ProtectedRoute>
                <Layout>
                  <AllocationIntelligence />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/next-best-actions"
            element={
              <ProtectedRoute>
                <Layout>
                  <NextBestActions />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Finance Routes */}
          <Route
            path="/invoicing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Invoicing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ar-ap"
            element={
              <ProtectedRoute>
                <Layout>
                  <ARAP />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/taxes-vat"
            element={
              <ProtectedRoute>
                <Layout>
                  <TaxesVAT />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/multi-currency-fx"
            element={
              <ProtectedRoute>
                <Layout>
                  <MultiCurrencyFX />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounting-integrations"
            element={
              <ProtectedRoute>
                <Layout>
                  <AccountingIntegrations />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-trail"
            element={
              <ProtectedRoute>
                <Layout>
                  <AuditTrail />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Admin Routes */}
          <Route
            path="/organization-settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationSettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SystemSettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <Layout>
                  <Security />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/data-exports"
            element={
              <ProtectedRoute>
                <Layout>
                  <DataExports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
