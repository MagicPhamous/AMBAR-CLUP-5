/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { useApp } from './context/AppContext';
import { UserRole, TableStatus } from './types';
import { CustomAlertModal } from './components/CustomAlertModal';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const POS = lazy(() => import('./pages/POS'));
const CashRegister = lazy(() => import('./pages/CashRegister'));
const Tables = lazy(() => import('./pages/Tables'));
const Reports = lazy(() => import('./pages/Reports'));
const Audit = lazy(() => import('./pages/Audit'));
const Settings = lazy(() => import('./pages/Settings'));
const WaiterMenu = lazy(() => import('./pages/WaiterDashboard').then(m => ({ default: m.WaiterMenu })));
const WaiterDiscoSales = lazy(() => import('./pages/WaiterDiscoSales'));
const BartenderComandas = lazy(() => import('./pages/BartenderConsole').then(m => ({ default: m.BartenderComandas })));
const BartenderPour = lazy(() => import('./pages/BartenderConsole').then(m => ({ default: m.BartenderPour })));
const BartenderBottles = lazy(() => import('./pages/BartenderConsole').then(m => ({ default: m.BartenderBottles })));
const BartenderCocktails = lazy(() => import('./pages/BartenderConsole').then(m => ({ default: m.BartenderCocktails })));
const ClientDirectory = lazy(() => import('./pages/ClientDirectory'));
const CashExpenses = lazy(() => import('./pages/CashExpenses'));
const WarehouseRestock = lazy(() => import('./pages/WarehouseRestock'));
const DailyAuditSheet = lazy(() => import('./pages/DailyAuditSheet'));
const ClubManagement = lazy(() => import('./pages/ClubManagement'));
const Commissions = lazy(() => import('./pages/Commissions').then(m => ({ default: m.Commissions })));

const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-3">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-mono text-zinc-400">Cargando módulo...</span>
  </div>
);

import { 
  LayoutDashboard, 
  Boxes, 
  Barcode, 
  Wine, 
  DollarSign, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  ShieldAlert,
  Sliders,
  UserCheck,
  Sparkles,
  PackagePlus,
  FileSpreadsheet,
  Wallet,
  Flame,
  Calendar,
  Percent
} from 'lucide-react';

export default function App() {
  const { currentUser, logout, products, activeSession, config, tables } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [currentTab, setCurrentTab] = useState(() => {
    if (!currentUser) return 'dashboard';
    if (currentUser.role === UserRole.MESERO) return 'waiter-disco-sales';
    if (currentUser.role === UserRole.BARTENDER) return 'bartender-console';
    if (currentUser.role === UserRole.CAJA) return 'pos';
    if (currentUser.role === UserRole.ALMACENERO) return 'warehouse-restock';
    if (currentUser.role === UserRole.GERENTE) return 'products';
    return 'dashboard';
  });

  // Sync tab whenever a different user logs in
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === UserRole.MESERO) {
        setCurrentTab('waiter-disco-sales');
      } else if (currentUser.role === UserRole.BARTENDER) {
        setCurrentTab('bartender-console');
      } else if (currentUser.role === UserRole.CAJA) {
        setCurrentTab('pos');
      } else if (currentUser.role === UserRole.ALMACENERO) {
        setCurrentTab('warehouse-restock');
      } else if (currentUser.role === UserRole.GERENTE) {
        setCurrentTab('products');
      } else {
        setCurrentTab('dashboard');
      }
    }
  }, [currentUser?.uid]);

  // If there's no active user session, force render the login view
  if (!currentUser) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Login />
        <CustomAlertModal />
      </Suspense>
    );
  }

  // Count low stock products to show badge alerts
  const lowStockCount = products.filter(p => p.isActive && p.quantity <= p.minStock).length;

  // Determine menu items based on user roles for full interface separation
  const getMenuItemsByRole = () => {
    switch (currentUser.role) {
      case UserRole.MESERO:
        return [
          { id: 'waiter-menu', name: 'Consulta de Menú', icon: Boxes },
          { id: 'tables', name: 'Reservaciones & Alertas', icon: Calendar },
          { id: 'waiter-disco-sales', name: 'Ventas Disco (Reportar)', icon: Sparkles },
          { id: 'commissions', name: 'Mis Comisiones (1%)', icon: Percent },
        ];
      case UserRole.BARTENDER:
        return [
          { id: 'bartender-console', name: 'Cola de Bebidas', icon: Wine },
          { id: 'bartender-pour', name: 'Dispensador Rápido', icon: Sparkles },
          { id: 'bartender-cocktails', name: 'Estación de Cócteles', icon: Flame },
          { id: 'bartender-bottles', name: 'Control de Botellas', icon: Sliders },
          { id: 'daily-audit', name: 'Planilla de Cierre', icon: FileSpreadsheet },
        ];
      case UserRole.CAJA:
        return [
          { id: 'pos', name: 'Punto de Venta POS', icon: Barcode },
          { id: 'tables', name: 'Reservaciones & Mesas', icon: Calendar },
          { id: 'cash', name: 'Control de Caja', icon: DollarSign, badge: activeSession ? 'ABIERTA' : undefined },
          { id: 'commissions', name: 'Mis Comisiones (1%)', icon: Percent },
          { id: 'daily-audit', name: 'Planilla de Cierre', icon: FileSpreadsheet },
          { id: 'cash-expenses', name: 'Gastos de Caja', icon: Wallet },
        ];
      case UserRole.ALMACENERO:
        return [
          { id: 'warehouse-restock', name: 'Ingreso de Mercadería', icon: PackagePlus },
          { id: 'inventory', name: 'Kardex e Inventarios', icon: Sliders, badge: lowStockCount > 0 ? lowStockCount : undefined },
          { id: 'daily-audit', name: 'Planilla de Barra', icon: FileSpreadsheet },
          { id: 'products', name: 'Catálogo de Productos', icon: Boxes },
        ];
      case UserRole.GERENTE:
        return [
          { id: 'products', name: 'Catálogo de Productos', icon: Boxes },
          { id: 'inventory', name: 'Kardex e Inventarios', icon: Sliders, badge: lowStockCount > 0 ? lowStockCount : undefined },
          { id: 'tables', name: 'Mesas y VIP Lounges', icon: Wine },
          { id: 'commissions', name: 'Comisiones de Personal', icon: Percent },
          { id: 'cash-expenses', name: 'Gastos de Caja', icon: Wallet },
          { id: 'audit', name: 'Bitácora de Auditoría', icon: ShieldAlert },
        ];
      default:
        // Admin, Supervisor, Auditor see full corporate ERP
        return [
          { id: 'dashboard', name: 'Dashboard General', icon: LayoutDashboard },
          { id: 'products', name: 'Catálogo de Productos', icon: Boxes },
          { id: 'warehouse-restock', name: 'Ingresar Mercadería', icon: PackagePlus },
          { id: 'inventory', name: 'Kardex e Inventarios', icon: Sliders, badge: lowStockCount > 0 ? lowStockCount : undefined },
          { id: 'daily-audit', name: 'Planilla Diaria de Barra', icon: FileSpreadsheet },
          { id: 'pos', name: 'Punto de Venta POS', icon: Barcode },
          { id: 'tables', name: 'Mesas y VIP Lounges', icon: Wine },
          { id: 'cash', name: 'Control de Caja', icon: DollarSign, badge: activeSession ? 'ABIERTA' : undefined },
          { id: 'commissions', name: 'Comisiones de Personal (1%)', icon: Percent },
          { id: 'reports', name: 'Reportes y BI', icon: History },
          { id: 'club-management', name: 'Gestión y Contabilidad', icon: Wallet },
          { id: 'cash-expenses', name: 'Gastos de Caja', icon: Wallet },
          { id: 'audit', name: 'Bitácora de Auditoría', icon: ShieldAlert },
          { id: 'settings', name: 'Configuración Fiscal', icon: SettingsIcon },
        ];
    }
  };

  const menuItems = getMenuItemsByRole();

  // Define dynamic style/theme based on current user role
  const getThemeByRole = () => {
    switch (currentUser.role) {
      case UserRole.MESERO:
        return {
          portalName: 'PORTAL MESEROS',
          portalSub: 'Servicios & Comandas',
          accentColor: 'amber',
          textAccent: 'text-amber-500',
          textAccentHover: 'hover:text-amber-400',
          bgAccent: 'bg-amber-950/40 border-amber-900/30 text-amber-400',
          badgeBg: 'bg-amber-600',
          logoBg: 'bg-amber-600',
          avatarText: 'text-amber-500 border-amber-900/30 bg-amber-950/40',
          glowBorder: 'border-amber-900/20 shadow-amber-950/10',
          sidebarActiveLink: 'bg-amber-950/40 border border-amber-900/30 text-amber-400 font-semibold',
          sidebarActiveIcon: 'text-amber-500',
          sidebarHoverLink: 'hover:text-amber-300'
        };
      case UserRole.BARTENDER:
        return {
          portalName: 'CENTRAL DE BARRA',
          portalSub: 'Dispensadores & Cola',
          accentColor: 'cyan',
          textAccent: 'text-cyan-500',
          textAccentHover: 'hover:text-cyan-400',
          bgAccent: 'bg-cyan-950/40 border-cyan-900/30 text-cyan-400',
          badgeBg: 'bg-cyan-600',
          logoBg: 'bg-cyan-600',
          avatarText: 'text-cyan-500 border-cyan-900/30 bg-cyan-950/40',
          glowBorder: 'border-cyan-900/20 shadow-cyan-950/10',
          sidebarActiveLink: 'bg-cyan-950/40 border border-cyan-900/30 text-cyan-400 font-semibold',
          sidebarActiveIcon: 'text-cyan-500',
          sidebarHoverLink: 'hover:text-cyan-300'
        };
      case UserRole.CAJA:
        return {
          portalName: 'TERMINAL DE COBROS',
          portalSub: 'Caja POS & Clientes',
          accentColor: 'emerald',
          textAccent: 'text-emerald-500',
          textAccentHover: 'hover:text-emerald-400',
          bgAccent: 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400',
          badgeBg: 'bg-emerald-600',
          logoBg: 'bg-emerald-600',
          avatarText: 'text-emerald-500 border-emerald-900/30 bg-emerald-950/40',
          glowBorder: 'border-emerald-900/20 shadow-emerald-950/10',
          sidebarActiveLink: 'bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 font-semibold',
          sidebarActiveIcon: 'text-emerald-500',
          sidebarHoverLink: 'hover:text-emerald-300'
        };
      case UserRole.ALMACENERO:
        return {
          portalName: 'PORTAL ALMACÉN',
          portalSub: 'Abastecimiento e Inventarios',
          accentColor: 'indigo',
          textAccent: 'text-indigo-400',
          textAccentHover: 'hover:text-indigo-300',
          bgAccent: 'bg-indigo-950/40 border-indigo-900/30 text-indigo-400',
          badgeBg: 'bg-indigo-600',
          logoBg: 'bg-indigo-600',
          avatarText: 'text-indigo-400 border-indigo-900/30 bg-indigo-950/40',
          glowBorder: 'border-indigo-900/20 shadow-indigo-950/10',
          sidebarActiveLink: 'bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 font-semibold',
          sidebarActiveIcon: 'text-indigo-400',
          sidebarHoverLink: 'hover:text-indigo-300'
        };
      case UserRole.GERENTE:
        return {
          portalName: 'CONSOLA GERENCIAL',
          portalSub: 'Supervisión & Almacén',
          accentColor: 'amber',
          textAccent: 'text-amber-500',
          textAccentHover: 'hover:text-amber-400',
          bgAccent: 'bg-amber-950/40 border-amber-900/30 text-amber-400',
          badgeBg: 'bg-amber-600',
          logoBg: 'bg-amber-600',
          avatarText: 'text-amber-500 border-amber-900/30 bg-amber-950/40',
          glowBorder: 'border-amber-900/20 shadow-amber-950/10',
          sidebarActiveLink: 'bg-amber-950/40 border border-amber-900/30 text-amber-400 font-semibold',
          sidebarActiveIcon: 'text-amber-500',
          sidebarHoverLink: 'hover:text-amber-300'
        };
      default:
        return {
          portalName: 'AMBAR ERP',
          portalSub: 'Control & Auditoría',
          accentColor: 'red',
          textAccent: 'text-red-500',
          textAccentHover: 'hover:text-red-400',
          bgAccent: 'bg-red-950/40 border-red-900/30 text-red-400',
          badgeBg: 'bg-red-600',
          logoBg: 'bg-red-600',
          avatarText: 'text-red-500 border-red-900/30 bg-red-950/40',
          glowBorder: 'border-red-900/20 shadow-red-950/10',
          sidebarActiveLink: 'bg-red-950/40 border border-red-900/30 text-red-400 font-semibold',
          sidebarActiveIcon: 'text-red-500',
          sidebarHoverLink: 'hover:text-red-300'
        };
    }
  };

  const theme = getThemeByRole();

  const renderHeaderStats = () => {
    switch (currentUser.role) {
      case UserRole.MESERO: {
        const occupiedCount = tables?.filter(t => t.status === TableStatus.OCCUPIED).length || 0;
        return (
          <span className="hidden md:flex bg-amber-950/40 border border-amber-900/30 text-amber-400 text-[9px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>{occupiedCount} Mesas Activas en Tu Turno</span>
          </span>
        );
      }
      case UserRole.BARTENDER: {
        const pendingDrinksCount = tables?.filter(t => t.consumption && t.consumption.length > 0).reduce((acc, t) => {
          const drinks = t.consumption.filter(item => {
            const cat = (item.product?.category || '').toLowerCase();
            const unit = (item.product?.unit || '').toLowerCase();
            return cat.includes('whisky') || cat.includes('ron') || cat.includes('vodka') || cat.includes('tequila') || cat.includes('gin') || cat.includes('cerveza') || cat.includes('trago') || cat.includes('coctel') || cat.includes('bebida') || cat.includes('refresco') || cat.includes('energizante') || unit.includes('trago') || unit.includes('copa') || unit.includes('botella');
          });
          return acc + drinks.reduce((sum, d) => sum + d.quantity, 0);
        }, 0) || 0;
        return (
          <span className="hidden md:flex bg-cyan-950/40 border border-cyan-900/30 text-cyan-400 text-[9px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full ${pendingDrinksCount > 0 ? 'bg-red-500' : 'bg-cyan-500'} animate-pulse`} />
            <span>{pendingDrinksCount} Tragos / Bebidas Pendientes</span>
          </span>
        );
      }
      case UserRole.CAJA: {
        return (
          <span className="hidden md:flex bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[9px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activeSession ? 'CAJA ACTIVA • POS SINCRONIZADO' : 'SISTEMA BLOQUEADO • ABRE CAJA'}</span>
          </span>
        );
      }
      case UserRole.ALMACENERO: {
        return (
          <span className="hidden md:flex bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 text-[9px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full ${lowStockCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`} />
            <span>{lowStockCount > 0 ? `${lowStockCount} ALERTAS DE STOCK BAJO` : 'STOCK CENTRAL ABASTECIDO'}</span>
          </span>
        );
      }
      default:
        return (
          <span className="hidden md:flex bg-red-950/40 border border-red-900/30 text-red-400 text-[9px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>{lowStockCount} ALERTAS DE INVENTARIO CRÍTICO</span>
          </span>
        );
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'inventory':
        return <Inventory />;
      case 'warehouse-restock':
        return <WarehouseRestock />;
      case 'daily-audit':
        return <DailyAuditSheet />;
      case 'pos':
        return <POS />;
      case 'tables':
        return <Tables />;
      case 'cash':
        return <CashRegister />;
      case 'reports':
        return <Reports />;
      case 'club-management':
        return <ClubManagement />;
      case 'commissions':
        return <Commissions />;
      case 'audit':
        return <Audit />;
      case 'settings':
        return <Settings />;
      
      // Waiter-specific views
      case 'waiter-menu':
        return <WaiterMenu />;
      case 'waiter-disco-sales':
        return <WaiterDiscoSales />;

      // Bartender-specific views
      case 'bartender-console':
        return <BartenderComandas />;
      case 'bartender-pour':
        return <BartenderPour />;
      case 'bartender-cocktails':
        return <BartenderCocktails />;
      case 'bartender-bottles':
        return <BartenderBottles />;

      // Cashier-specific views
      case 'cash-expenses':
        return <CashExpenses />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex font-sans animate-fade-in" id="app-frame">
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between shrink-0 transition-all z-40 duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} fixed lg:static h-full lg:h-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        id="app-sidebar"
      >
        <div>
          {/* Sidebar Top Logo */}
          <div className="h-16 border-b border-zinc-900 px-5 flex items-center justify-between bg-zinc-950">
            <div className="flex items-center gap-2.5">
              <span className={`w-7 h-7 ${theme.logoBg} rounded-lg flex items-center justify-center font-display font-black text-white text-base shadow transition-all duration-300`}>
                A
              </span>
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="font-display font-bold text-white tracking-widest text-xs uppercase">AMBAR CLUB</span>
                  <span className={`text-[8px] font-mono tracking-wider font-bold ${theme.textAccent}`}>{theme.portalName}</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User profile capsule with custom role indicator */}
          {isSidebarOpen && (
            <div className="p-4 mx-4 my-4 bg-zinc-900/20 border border-zinc-900 rounded-xl flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border font-semibold ${theme.avatarText}`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-sans font-semibold text-white truncate block">{currentUser.name}</span>
                <span className={`text-[8px] font-mono font-bold uppercase tracking-widest block mt-0.5 ${theme.textAccent}`}>{currentUser.role}</span>
              </div>
            </div>
          )}

          {/* Navigation Links list */}
          <nav className="px-3 py-4 space-y-1" id="nav-container">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    // on mobile, auto close sidebar when choosing item
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono tracking-wide transition-all duration-200 cursor-pointer border ${isActive ? theme.sidebarActiveLink : 'text-zinc-400 hover:text-white border-transparent'}`}
                  title={item.name}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? theme.sidebarActiveIcon : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    {isSidebarOpen && <span>{item.name}</span>}
                  </div>

                  {isSidebarOpen && item.badge !== undefined && (
                    <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded ${item.id === 'inventory' ? 'bg-red-600 text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/30 animate-pulse'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Logout action */}
        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 p-2 rounded-lg text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Content container with Dynamic Border Glow highlighting the active viewport role */}
      <div className={`flex-1 flex flex-col min-w-0 border-t md:border-t-0 md:border-l border-zinc-900 transition-all duration-300`} id="main-content-wrapper">
        {/* Top Navbar Header bar */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950 px-6 flex items-center justify-between" id="app-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
              Sistema de Gestión & POS
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Dynamic Role-tailored Pill Status Info */}
            {renderHeaderStats()}

            {/* Quick alert notifications bell */}
            <div className="relative">
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${theme.accentColor === 'amber' ? 'bg-amber-500' : theme.accentColor === 'cyan' ? 'bg-cyan-500' : theme.accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <button className="text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Centro de Notificaciones">
                <Bell className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Container */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-64px)] bg-black" id="workspace">
          <Suspense fallback={<PageLoadingFallback />}>
            {renderActiveTab()}
          </Suspense>
        </main>
      </div>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="logout-modal-overlay">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5" id="logout-modal">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-full flex items-center justify-center text-red-500">
                <LogOut className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-mono font-bold tracking-wider text-white uppercase">Cerrar Sesión</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                ¿Desea cerrar la sesión activa en el sistema ERP de AMBAR CLUB?
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono border border-zinc-800 hover:bg-zinc-900 text-zinc-400 transition-colors cursor-pointer"
                id="logout-cancel-btn"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer font-bold shadow-md shadow-red-950/50"
                id="logout-confirm-btn"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Custom Alert Modal Popup */}
      <CustomAlertModal />
    </div>
  );
}
