import React, { useCallback, useEffect, useState } from 'react';
import {
  BrainCircuit,
  Building2,
  Compass,
  FilePlus2,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { civicApi, setClientOfficerToken, type MunicipalZoneInfo } from './api/client';
import { AuthorityLogin, type AuthorizedOfficer } from './components/AuthorityLogin';
import { ComplaintDetailDrawer } from './components/ComplaintDetailDrawer';
import { AdminDashboard } from './pages/AdminDashboard';
import { AIIntelligenceCenter } from './pages/AIIntelligenceCenter';
import { CitizenPortal } from './pages/CitizenPortal';
import { CitizenTracking } from './pages/CitizenTracking';
import type {
  CivicReport,
  CivicReportDetail,
  DashboardKPIs,
  GeographicHotspot,
} from './types/civic';

type ModuleRoute = 'dashboard' | 'citizen' | 'intelligence' | 'tracking';

const EMPTY_KPIS: DashboardKPIs = {
  totalReports: 0,
  pendingReports: 0,
  criticalReports: 0,
  highPriorityReports: 0,
  resolvedReports: 0,
  duplicateReports: 0,
  confirmedDuplicates: 0,
  suggestedDuplicates: 0,
  hotspotCount: 0,
  demoReportCount: 0,
  citizenReportCount: 0,
  categoryCounts: {},
  statusCounts: {},
  priorityCounts: { Critical: 0, High: 0, Medium: 0, Low: 0 },
};

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleRoute>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'citizen' || view === 'intelligence' || view === 'tracking' || view === 'dashboard') {
      return view;
    }
    return 'citizen'; // Default to anonymous Citizen Portal so public can immediately submit complaints!
  });

  const [authenticatedOfficer, setAuthenticatedOfficer] = useState<AuthorizedOfficer | null>(() => {
    try {
      const saved = localStorage.getItem('civicpulse_officer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (authenticatedOfficer) {
      const token = `muni_tok_${authenticatedOfficer.id}_${btoa(authenticatedOfficer.email)}`;
      setClientOfficerToken(token);
    } else {
      setClientOfficerToken(null);
    }
  }, [authenticatedOfficer]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [kpis, setKpis] = useState<DashboardKPIs>(EMPTY_KPIS);
  const [departments, setDepartments] = useState<string[]>([]);
  const [zones, setZones] = useState<MunicipalZoneInfo[]>([]);
  const [hotspots, setHotspots] = useState<GeographicHotspot[]>([]);
  const [allReports, setAllReports] = useState<CivicReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [trackingLookupId, setTrackingLookupId] = useState<string | null>(null);
  const [recentCitizenIds, setRecentCitizenIds] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    try {
      setBootError(null);
      const [overview, reportList] = await Promise.all([
        civicApi.getOverview(),
        civicApi.getReports({ sortBy: 'priority_desc' }),
      ]);
      setKpis(overview.kpis);
      setDepartments(overview.departments);
      setZones(overview.zones);
      setHotspots(overview.hotspots);
      setAllReports(reportList.reports);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      setBootError((err as Error).message || 'Unable to connect to CivicPulse AI backend.');
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleCitizenSubmitted = (newReport: CivicReportDetail) => {
    setRecentCitizenIds((prev) => [newReport.reportId, ...prev]);
    loadWorkspaceData();
  };

  const handleOfficerLogin = (officer: AuthorizedOfficer) => {
    setAuthenticatedOfficer(officer);
    try {
      localStorage.setItem('civicpulse_officer', JSON.stringify(officer));
    } catch {
      // ignore
    }
  };

  const handleOfficerLogout = () => {
    setAuthenticatedOfficer(null);
    try {
      localStorage.removeItem('civicpulse_officer');
    } catch {
      // ignore
    }
  };

  const navItems: Array<{
    id: ModuleRoute;
    label: string;
    stage: string;
    badge?: string;
    isProtected?: boolean;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'citizen',
      label: 'Citizen Portal',
      stage: 'Capture',
      badge: 'Anonymous',
      Icon: FilePlus2,
    },
    {
      id: 'dashboard',
      label: 'Authority Dashboard',
      stage: 'Act & Triage',
      isProtected: true,
      badge: authenticatedOfficer ? 'Authorized' : 'Sign In Required',
      Icon: LayoutDashboard,
    },
    {
      id: 'intelligence',
      label: 'AI Intelligence',
      stage: 'Understand & Reveal',
      Icon: BrainCircuit,
    },
    {
      id: 'tracking',
      label: 'Track Complaint',
      stage: 'Public Progress',
      Icon: Compass,
    },
  ];

  const currentNav = navItems.find((n) => n.id === activeModule) ?? navItems[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar Navigation */}
      <aside
        aria-label="Primary module navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-slate-950 text-slate-200 border-r border-slate-800"
      >
        <div className="px-6 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-teal-400 shrink-0" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
              CivicPulse AI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 leading-snug">
            Turning Civic Complaints into Intelligent Public Action
          </p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ id, label, stage, badge, isProtected, Icon }) => {
            const active = activeModule === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveModule(id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium truncate">{label}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isProtected && !authenticatedOfficer ? (
                    <Lock className="w-3 h-3 text-amber-400" aria-label="Sign-in required" />
                  ) : isProtected && authenticatedOfficer ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" aria-label="Authorized" />
                  ) : null}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      active
                        ? 'bg-blue-800 text-blue-100'
                        : badge === 'Anonymous'
                        ? 'bg-slate-800 text-teal-300'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {badge ? badge : stage.split(' ')[0]}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Authenticated Officer Status Card or Sign In Link */}
        <div className="p-3.5 m-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          {authenticatedOfficer ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Authorized Officer
                </span>
                <button
                  type="button"
                  onClick={handleOfficerLogout}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                  title="Sign Out of Authority Console"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out
                </button>
              </div>
              <div className="font-semibold text-white truncate text-xs">
                {authenticatedOfficer.name}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {authenticatedOfficer.department}
              </div>
              <div className="font-mono text-[10px] text-slate-500">
                Badge: {authenticatedOfficer.badgeNumber}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Authority Console Protected</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Only authorized officers can dispatch, assign staff, and update workflow status.
              </p>
              <button
                type="button"
                onClick={() => setActiveModule('dashboard')}
                className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold text-center transition-colors"
              >
                Officer Sign In
              </button>
            </div>
          )}
        </div>

        {/* Live Database Summary in Sidebar Footer */}
        <div className="p-3.5 m-3 mt-0 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
          <div className="text-slate-400 font-medium">Municipal Queue Snapshot</div>
          <div className="flex items-center justify-between font-mono tabular-nums">
            <span className="text-slate-300">Stored Reports</span>
            <span className="text-white font-semibold">{kpis.totalReports}</span>
          </div>
          <div className="flex items-center justify-between font-mono tabular-nums">
            <span className="text-slate-300">Critical Queue</span>
            <span className="text-red-400 font-semibold">{kpis.criticalReports}</span>
          </div>
          <div className="flex items-center justify-between font-mono tabular-nums">
            <span className="text-slate-300">Active Hotspots</span>
            <span className="text-teal-400 font-semibold">{kpis.hotspotCount}</span>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-slate-950 text-white h-full p-4 flex flex-col z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-display text-base font-bold">CivicPulse AI</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="mt-4 space-y-1">
              {navItems.map(({ id, label, Icon, badge }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveModule(id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    activeModule === id
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </span>
                  {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium text-slate-500 truncate">
              <span className="text-slate-900 font-semibold">CivicPulse AI</span>
              <span className="mx-2 text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="text-slate-800">
                {activeModule === 'dashboard' && !authenticatedOfficer
                  ? 'Authority Officer Sign In'
                  : currentNav.label}
              </span>
            </div>
          </div>

          {/* Center: Anonymous Citizen Guarantee Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Anonymous Citizen Filing</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">No account required</span>
          </div>

          {/* Right: Actions / Officer Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            {authenticatedOfficer ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {authenticatedOfficer.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {authenticatedOfficer.badgeNumber} · {authenticatedOfficer.department}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOfficerLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-red-300 hover:bg-red-50 text-xs font-semibold text-slate-700 hover:text-red-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModule('dashboard')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-blue-700" />
                <span>Officer Sign In</span>
              </button>
            )}

            {activeModule !== 'citizen' ? (
              <button
                type="button"
                onClick={() => setActiveModule('citizen')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap shadow-xs"
              >
                Report Civic Issue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModule('tracking')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Track Existing ID
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {bootError && (
            <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
              {bootError}
            </div>
          )}

          {/* Authority Portal with Sign In Gate */}
          {activeModule === 'dashboard' &&
            (!authenticatedOfficer ? (
              <AuthorityLogin
                onLogin={handleOfficerLogin}
                onGoToPublicPortal={() => setActiveModule('citizen')}
              />
            ) : (
              <AdminDashboard
                kpis={kpis}
                onSelectReport={(id) => setSelectedReportId(id)}
                onReloadOverview={loadWorkspaceData}
                refreshTrigger={refreshTrigger}
              />
            ))}

          {activeModule === 'citizen' && (
            <CitizenPortal
              existingReports={allReports}
              zones={zones}
              onSubmitted={handleCitizenSubmitted}
              onTrackId={(tid) => {
                setTrackingLookupId(tid);
                setActiveModule('tracking');
              }}
              onInspectInAdmin={(rid) => {
                setActiveModule('dashboard');
                setSelectedReportId(rid);
              }}
            />
          )}

          {activeModule === 'intelligence' && (
            <AIIntelligenceCenter
              reports={allReports}
              initialHotspots={hotspots}
              zones={zones}
              onSelectReport={(id) => setSelectedReportId(id)}
              onKpisUpdated={() => loadWorkspaceData()}
            />
          )}

          {activeModule === 'tracking' && (
            <CitizenTracking
              initialTrackingId={trackingLookupId}
              recentIds={recentCitizenIds}
            />
          )}
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>CivicPulse AI — Municipal Complaint Triage, Geospatial Intelligence & Public Tracking</span>
          <span>PromptWars x ASTRA — From Complaints to Action</span>
        </footer>
      </div>

      {/* Slide-over Complaint Detail & Assignment Inspector */}
      <ComplaintDetailDrawer
        reportId={selectedReportId}
        departments={departments}
        currentOfficerName={authenticatedOfficer?.name}
        isAuthorizedOfficer={Boolean(authenticatedOfficer)}
        onRequireOfficerLogin={() => {
          setSelectedReportId(null);
          setActiveModule('dashboard');
        }}
        onClose={() => setSelectedReportId(null)}
        onUpdated={(updatedKpis) => {
          if (updatedKpis) {
            setKpis(updatedKpis);
          }
          loadWorkspaceData();
        }}
      />
    </div>
  );
}
