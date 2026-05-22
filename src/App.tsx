import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import SalesDashboard from './pages/SalesDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import Review from './pages/Review';
import Products from './pages/Products';
// import Collections from './pages/Collections'; // Replaced by CollectionsDrops
import Inventory from './pages/Inventory';
import Warehouses from './pages/Warehouses';
import WarehousesLocations from './pages/WarehousesLocations';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Calendar from './pages/Calendar';
import UpcomingEvents from './pages/UpcomingEvents';
import AssetsDAM from './pages/AssetsDAM';
import Alerts from './pages/Alerts';
import Exceptions from './pages/Exceptions';
import KPIReports from './pages/KPIReports';
import MyTasks from './pages/MyTasks';
import BOMCosting from './pages/BOMCosting';
import Drops from './pages/Drops';
import CollectionsDrops from './pages/CollectionsDrops';
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
// import ExecutiveOverview from './pages/ExecutiveOverview'; // File not found
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
import ProductionOrders from './pages/ProductionOrders';
import LandedCost from './pages/LandedCost';
import VendorsFactories from './pages/VendorsFactories';
import StockControl from './pages/StockControl';
import Scanning from './pages/Scanning';
import Counting from './pages/Counting';
import PickPackShip from './pages/PickPackShip';
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
import ExecutiveOverview from './pages/ExecutiveOverview';

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
          <Route
            path="/dashboard"
            element={<Navigate to="/executive-overview" replace />}
          />
          <Route
            path="/sales"
            element={
              <Layout>
                  <SalesDashboard />
              </Layout>
            }
          />
          <Route
            path="/finance"
            element={
              <Layout>
                  <FinanceDashboard />
              </Layout>
            }
          />
          <Route
            path="/review"
            element={
              <Layout>
                  <Review />
              </Layout>
            }
          />
          <Route
            path="/products"
            element={
              <Layout>
                  <Products />
              </Layout>
            }
          />
          <Route
            path="/collections"
            element={
              <Layout>
                  <CollectionsDrops />
              </Layout>
            }
          />
          <Route
            path="/inventory"
            element={
              <Layout>
                  <Inventory />
              </Layout>
            }
          />
          <Route
            path="/warehouses"
            element={
              <Layout>
                  <Warehouses />
              </Layout>
            }
          />
          <Route
            path="/orders"
            element={
              <Layout>
                  <Orders />
              </Layout>
            }
          />
          <Route
            path="/customers"
            element={
              <Layout>
                  <Customers />
              </Layout>
            }
          />
          <Route
            path="/analytics"
            element={
              <Layout>
                  <Analytics />
              </Layout>
            }
          />
          <Route
            path="/profile"
            element={
              <Layout>
                  <Profile />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout>
                  <Settings />
              </Layout>
            }
          />
          <Route
            path="/notifications"
            element={
              <Layout>
                  <Notifications />
              </Layout>
            }
          />
          <Route
            path="/calendar"
            element={
              <Layout>
                  <Calendar />
              </Layout>
            }
          />
          <Route
            path="/upcoming-events"
            element={
              <Layout>
                  <UpcomingEvents />
              </Layout>
            }
          />
          <Route
            path="/documents"
            element={
              <Layout>
                  <AssetsDAM />
              </Layout>
            }
          />
          {/* Dashboard / KPIs Routes */}
          <Route
            path="/alerts"
            element={
              <Layout>
                  <Alerts />
              </Layout>
            }
          />
          <Route
            path="/exceptions"
            element={
              <Layout>
                  <Exceptions />
              </Layout>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <Layout>
                  <MyTasks />
              </Layout>
            }
          />
          <Route
            path="/kpi-reports"
            element={
              <Layout>
                  <KPIReports />
              </Layout>
            }
          />
          {/* Product Routes */}
          <Route
            path="/bom"
            element={
              <Layout>
                  <BOMCosting />
              </Layout>
            }
          />
          <Route
            path="/costing"
            element={
              <Layout>
                  <BOMCosting />
              </Layout>
            }
          />
          <Route
            path="/drops"
            element={
              <Layout>
                  <Drops />
              </Layout>
            }
          />
          <Route
            path="/pricing"
            element={
              <Layout>
                  <Pricing />
              </Layout>
            }
          />
          {/* Sales Routes */}
          <Route
            path="/retailers"
            element={
              <Layout>
                  <Retailers />
              </Layout>
            }
          />
          <Route
            path="/returns"
            element={
              <Layout>
                  <Returns />
              </Layout>
            }
          />
          <Route
            path="/wholesale"
            element={
              <Layout>
                  <Wholesale />
              </Layout>
            }
          />
          {/* Marketing Routes */}
          <Route
            path="/launch-planning"
            element={
              <Layout>
                  <LaunchPlanning />
              </Layout>
            }
          />
          <Route
            path="/retailer-enablement"
            element={
              <Layout>
                  <RetailerEnablement />
              </Layout>
            }
          />
          <Route
            path="/content-readiness"
            element={
              <Layout>
                  <ContentReadiness />
              </Layout>
            }
          />
          {/* Operations Routes */}
          <Route
            path="/fulfillment"
            element={
              <Layout>
                  <Fulfillment />
              </Layout>
            }
          />
          <Route
            path="/receiving"
            element={
              <Layout>
                  <Receiving />
              </Layout>
            }
          />
          <Route
            path="/purchasing"
            element={
              <Layout>
                  <Purchasing />
              </Layout>
            }
          />
          <Route
            path="/replenishment"
            element={
              <Layout>
                  <Replenishment />
              </Layout>
            }
          />
          <Route
            path="/forecast"
            element={
              <Layout>
                  <Forecast />
              </Layout>
            }
          />
          {/* Admin Routes */}
          <Route
            path="/users"
            element={
              <Layout>
                  <Users />
              </Layout>
            }
          />
          <Route
            path="/roles"
            element={
              <Layout>
                  <Roles />
              </Layout>
            }
          />
          <Route
            path="/integrations"
            element={
              <Layout>
                  <Integrations />
              </Layout>
            }
          />
          <Route
            path="/audit-log"
            element={
              <Layout>
                  <AuditLog />
              </Layout>
            }
          />
          <Route
            path="/rules"
            element={
              <Layout>
                  <Rules />
              </Layout>
            }
          />
          {/* Dashboards Routes */}
          <Route
            path="/executive-overview"
            element={
              <Layout>
                  <ExecutiveOverview />
              </Layout>
            }
          />
          <Route
            path="/product-collection-dashboard"
            element={
              <Layout>
                  <ProductCollectionDashboard />
              </Layout>
            }
          />
          <Route
            path="/inventory-fulfillment-dashboard"
            element={
              <Layout>
                  <InventoryFulfillmentDashboard />
              </Layout>
            }
          />
          <Route
            path="/sales-dashboard"
            element={
              <Layout>
                  <SalesDashboard />
              </Layout>
            }
          />
          <Route
            path="/finance-dashboard"
            element={
              <Layout>
                  <FinanceDashboard />
              </Layout>
            }
          />
          <Route
            path="/alerts-exceptions-dashboard"
            element={
              <Layout>
                  <AlertsExceptionsDashboard />
              </Layout>
            }
          />
          {/* Product Routes */}
          <Route
            path="/sku-ean-barcodes"
            element={
              <Layout>
                  <SkuEanBarcodes />
              </Layout>
            }
          />
          <Route
            path="/size-fit"
            element={
              <Layout>
                  <SizeFit />
              </Layout>
            }
          />
          <Route
            path="/sustainability-compliance"
            element={
              <Layout>
                  <SustainabilityCompliance />
              </Layout>
            }
          />
          {/* Sales Routes */}
          <Route
            path="/b2b-portal"
            element={
              <Layout>
                  <B2BPortal />
              </Layout>
            }
          />
          <Route
            path="/quotes-proformas"
            element={
              <Layout>
                  <QuotesProformas />
              </Layout>
            }
          />
          <Route
            path="/sales-reps"
            element={
              <Layout>
                  <SalesReps />
              </Layout>
            }
          />
          <Route
            path="/sales-analytics"
            element={
              <Layout>
                  <SalesAnalytics />
              </Layout>
            }
          />
          {/* Marketing Routes */}
          <Route
            path="/campaign-planner"
            element={
              <Layout>
                  <CampaignPlanner />
              </Layout>
            }
          />
          <Route
            path="/assortment-merchandising"
            element={
              <Layout>
                  <AssortmentMerchandising />
              </Layout>
            }
          />
          <Route
            path="/marketing-insights"
            element={
              <Layout>
                  <MarketingInsights />
              </Layout>
            }
          />
          <Route
            path="/marketing-integrations"
            element={
              <Layout>
                  <MarketingIntegrations />
              </Layout>
            }
          />
          {/* Customer Experience Routes */}
          <Route
            path="/customer-profile"
            element={
              <Layout>
                  <CustomerProfile />
              </Layout>
            }
          />
          <Route
            path="/b2b-terms"
            element={
              <Layout>
                  <B2BTerms />
              </Layout>
            }
          />
          <Route
            path="/service"
            element={
              <Layout>
                  <Service />
              </Layout>
            }
          />
          {/* Operations Routes */}
          <Route
            path="/production-mrp"
            element={
              <Layout>
                  <ProductionMRP />
              </Layout>
            }
          />
          <Route
            path="/vendors-factories"
            element={
              <Layout>
                  <VendorsFactories />
              </Layout>
            }
          />
          <Route
            path="/production-orders"
            element={
              <Layout>
                  <ProductionOrders />
              </Layout>
            }
          />
          <Route
            path="/landed-cost"
            element={
              <Layout>
                  <LandedCost />
              </Layout>
            }
          />
          <Route
            path="/inventory-warehouse"
            element={
              <Layout>
                  <InventoryWarehouse />
              </Layout>
            }
          />
          <Route
            path="/warehouses-locations"
            element={
              <Layout>
                  <WarehousesLocations />
              </Layout>
            }
          />
          <Route
            path="/stock-control"
            element={
              <Layout>
                  <StockControl />
              </Layout>
            }
          />
          <Route
            path="/scanning"
            element={
              <Layout>
                  <Scanning />
              </Layout>
            }
          />
          <Route
            path="/counting"
            element={
              <Layout>
                  <Counting />
              </Layout>
            }
          />
          <Route
            path="/orders-fulfillment"
            element={
              <Layout>
                  <OrdersFulfillment />
              </Layout>
            }
          />
          <Route
            path="/pick-pack-ship"
            element={
              <Layout>
                  <PickPackShip />
              </Layout>
            }
          />
          <Route
            path="/returns-rma"
            element={
              <Layout>
                  <ReturnsRMA />
              </Layout>
            }
          />
          <Route
            path="/omnichannel"
            element={
              <Layout>
                  <Omnichannel />
              </Layout>
            }
          />
          {/* Planning & Intelligence Routes */}
          <Route
            path="/forecasting-ai"
            element={
              <Layout>
                  <ForecastingAI />
              </Layout>
            }
          />
          <Route
            path="/auto-po-proposals"
            element={
              <Layout>
                  <AutoPOProposals />
              </Layout>
            }
          />
          <Route
            path="/open-to-buy"
            element={
              <Layout>
                  <OpenToBuy />
              </Layout>
            }
          />
          <Route
            path="/dead-stock-markdown"
            element={
              <Layout>
                  <DeadStockMarkdown />
              </Layout>
            }
          />
          <Route
            path="/allocation-intelligence"
            element={
              <Layout>
                  <AllocationIntelligence />
              </Layout>
            }
          />
          <Route
            path="/next-best-actions"
            element={
              <Layout>
                  <NextBestActions />
              </Layout>
            }
          />
          {/* Finance Routes */}
          <Route
            path="/invoicing"
            element={
              <Layout>
                  <Invoicing />
              </Layout>
            }
          />
          <Route
            path="/ar-ap"
            element={
              <Layout>
                  <ARAP />
              </Layout>
            }
          />
          <Route
            path="/taxes-vat"
            element={
              <Layout>
                  <TaxesVAT />
              </Layout>
            }
          />
          <Route
            path="/multi-currency-fx"
            element={
              <Layout>
                  <MultiCurrencyFX />
              </Layout>
            }
          />
          <Route
            path="/accounting-integrations"
            element={
              <Layout>
                  <AccountingIntegrations />
              </Layout>
            }
          />
          <Route
            path="/audit-trail"
            element={
              <Layout>
                  <AuditTrail />
              </Layout>
            }
          />
          {/* Admin Routes */}
          <Route
            path="/organization-settings"
            element={
              <Layout>
                  <OrganizationSettings />
              </Layout>
            }
          />
          <Route
            path="/system-settings"
            element={
              <Layout>
                  <SystemSettings />
              </Layout>
            }
          />
          <Route
            path="/security"
            element={
              <Layout>
                  <Security />
              </Layout>
            }
          />
          <Route
            path="/data-exports"
            element={
              <Layout>
                  <DataExports />
              </Layout>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
