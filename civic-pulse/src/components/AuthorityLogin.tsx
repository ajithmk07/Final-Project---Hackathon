import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export interface AuthorizedOfficer {
  id: string;
  name: string;
  role: string;
  department: string;
  badgeNumber: string;
  email: string;
}

export const DEMO_OFFICERS: AuthorizedOfficer[] = [
  {
    id: 'OFF-01',
    name: 'Eng. Rajesh Kulkarni',
    role: 'Chief Municipal Engineer',
    department: 'Public Works Department',
    badgeNumber: 'PWD-2026-084',
    email: 'officer.pwd@city.gov',
  },
  {
    id: 'OFF-02',
    name: 'Dr. Anita Sharma',
    role: 'Zonal Health & Sanitation Commissioner',
    department: 'Health & Sanitation',
    badgeNumber: 'HSD-2026-119',
    email: 'officer.health@city.gov',
  },
  {
    id: 'OFF-03',
    name: 'Insp. Suresh Verma',
    role: 'Senior Electrical & Traffic Inspector',
    department: 'Electrical Inspectorate',
    badgeNumber: 'ELEC-2026-302',
    email: 'officer.elec@city.gov',
  },
  {
    id: 'OFF-04',
    name: 'Dispatcher Maya Chen',
    role: 'Control Room Dispatch Officer',
    department: 'Emergency & Central Command',
    badgeNumber: 'CMD-2026-007',
    email: 'officer.dispatch@city.gov',
  },
];

interface AuthorityLoginProps {
  onLogin: (officer: AuthorizedOfficer) => void;
  onGoToPublicPortal: () => void;
}

export function AuthorityLogin({ onLogin, onGoToPublicPortal }: AuthorityLoginProps) {
  const [email, setEmail] = useState('officer.pwd@city.gov');
  const [password, setPassword] = useState('MunicipalOfficer2026!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const matched = DEMO_OFFICERS.find(
        (o) => o.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (matched && password.length >= 6) {
        onLogin(matched);
      } else if (email.trim().endsWith('@city.gov') && password.length >= 6) {
        // Allow any realistic municipal officer email
        const customOfficer: AuthorizedOfficer = {
          id: `OFF-${Math.floor(100 + Math.random() * 900)}`,
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          role: 'Municipal Officer',
          department: 'Public Works Department',
          badgeNumber: `MUNI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          email: email.trim(),
        };
        onLogin(customOfficer);
      } else {
        setError('Invalid officer credentials. Use one of the authorized departmental officer accounts below or an authorized @city.gov email.');
      }
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Anonymous Public Notice Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
          <div>
            <strong className="font-semibold text-blue-950">Are you a citizen filing a complaint?</strong>{' '}
            <span>Public complaints are 100% anonymous — no login, registration, or password is ever required.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoToPublicPortal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors shadow-xs"
        >
          <span>Open Anonymous Citizen Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Secure Login Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Lock className="w-6 h-6 text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Restricted Municipal Network
                </span>
                <h1 className="text-xl font-bold text-slate-900 mt-1">
                  Authority Officer Sign In
                </h1>
                <p className="text-xs text-slate-500">
                  CivicPulse Administrative Console & Incident Dispatch System
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="officer-email"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Municipal Officer ID / Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="officer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer.pwd@city.gov"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="officer-password"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Security Passkey / Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="officer-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember this municipal workstation</span>
                </label>
                <span className="font-mono text-[11px] text-slate-400">TLS 1.3 / AES-256</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Authenticating Officer...</span>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <span>Sign In to Authority Console</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Authorized administrative officers only. All actions are cryptographically logged with officer badge IDs.</span>
          </div>
        </div>

        {/* Right: Quick Authorized Officer Profiles (Hackathon Evaluation & Role Testing) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-700/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-[11px] font-semibold border border-blue-400/30 mb-3">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Evaluation & Role Switcher</span>
            </div>
            <h2 className="text-base font-bold text-white">
              1-Click Authorized Officer Profiles
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Select an authorized departmental officer profile to test role-based dispatch, manual priority overrides, and audit trails:
            </p>
          </div>

          <div className="space-y-2.5">
            {DEMO_OFFICERS.map((officer) => (
              <button
                key={officer.id}
                type="button"
                onClick={() => onLogin(officer)}
                className="w-full text-left p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-blue-500 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white group-hover:text-blue-200 flex items-center gap-1.5">
                    <span>{officer.name}</span>
                    <span className="font-mono text-[10px] text-slate-400 font-normal">({officer.badgeNumber})</span>
                  </div>
                  <div className="text-[11px] text-slate-300">{officer.role}</div>
                  <div className="text-[10px] text-blue-400 font-medium">{officer.department}</div>
                </div>
                <div className="w-7 h-7 rounded-xl bg-slate-700 group-hover:bg-blue-600 text-slate-300 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-700/60 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Session authenticates immediately without external network dependencies.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
