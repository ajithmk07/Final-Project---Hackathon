import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  Crosshair,
  Droplets,
  FileUp,
  HelpCircle,
  Lightbulb,
  MapPin,
  Navigation,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Waves,
  Zap,
} from 'lucide-react';
import { civicApi, type MunicipalZoneInfo } from '../api/client';
import { InteractiveCivicMap } from '../components/InteractiveCivicMap';
import { PriorityIndicator, StatusIndicator } from '../components/PriorityIndicator';
import {
  CIVIC_CATEGORIES,
  type CivicCategory,
  type CivicReport,
  type CivicReportDetail,
} from '../types/civic';

interface CitizenPortalProps {
  existingReports: CivicReport[];
  zones: MunicipalZoneInfo[];
  onSubmitted: (newReport: CivicReportDetail) => void;
  onTrackId: (trackingId: string) => void;
  onInspectInAdmin: (reportId: string) => void;
}

// 1-Click quick templates to help citizens report issues instantly
interface QuickTemplate {
  label: string;
  category: CivicCategory;
  title: string;
  description: string;
  landmark: string;
  lat: string;
  lng: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: 'Road Pothole',
    category: 'Road Damage',
    title: 'Deep rainwater-filled pothole causing vehicle hazard',
    description:
      'There is a severe, deep pothole in the active traffic lane with broken asphalt edges. Vehicles and two-wheelers are swerving abruptly to avoid falling.',
    landmark: 'College Road & Main Gate Corridor',
    lat: '12.97214',
    lng: '77.59486',
  },
  {
    label: 'Dark Streetlight',
    category: 'Streetlight',
    title: 'Multiple streetlights blackout creating dangerous dark zone',
    description:
      'Row of consecutive streetlights have failed and remain off after dusk. The whole sidewalk is completely dark, causing serious pedestrian safety concerns.',
    landmark: 'Residential Layout Block 4',
    lat: '12.96200',
    lng: '77.59600',
  },
  {
    label: 'Garbage Dump Overflow',
    category: 'Garbage Management',
    title: 'Overflowing municipal waste bin spilling onto sidewalk',
    description:
      'Large garbage bin is overflowing with uncollected municipal solid waste. Refuse is scattering across the walkway and creating severe foul odor and health risks.',
    landmark: 'Old Market Crossroad & Wholesale Yard',
    lat: '12.96560',
    lng: '77.58900',
  },
  {
    label: 'Exposed Electrical Cable',
    category: 'Electrical Hazard',
    title: 'Exposed sagging high-voltage cable near bus shelter',
    description:
      'Low-hanging damaged electric cable hanging less than 2 metres above the pavement near the bus stop. Sparking was observed during light morning drizzle.',
    landmark: 'Industrial Ring Sub-Station & Bus Bay',
    lat: '12.97850',
    lng: '77.60220',
  },
  {
    label: 'Waterlogging & Blocked Drain',
    category: 'Waterlogging',
    title: 'Severe storm drain blockage causing knee-deep road flooding',
    description:
      'Rainwater has ponded across the intersection up to 1.5 feet deep because stormwater inlet grates are choked with silt and debris. Commuters are stranded.',
    landmark: 'Metro Station North Plaza',
    lat: '12.98100',
    lng: '77.59200',
  },
];

// Category icons map
const CATEGORY_ICONS: Record<CivicCategory, React.ComponentType<{ className?: string }>> = {
  'Road Damage': Compass,
  Waterlogging: Waves,
  'Garbage Management': Trash2,
  Streetlight: Lightbulb,
  'Electrical Hazard': Zap,
  Drainage: Droplets,
  'Water Supply': Droplets,
  'Public Infrastructure': Building,
  Other: HelpCircle,
};

export function CitizenPortal({
  existingReports,
  zones,
  onSubmitted,
  onTrackId,
  onInspectInAdmin,
}: CitizenPortalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CivicCategory | 'Auto-Detect'>('Auto-Detect');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('12.97214');
  const [longitude, setLongitude] = useState('77.59486');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const [showManualCoords, setShowManualCoords] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submittedResult, setSubmittedResult] = useState<{
    report: CivicReportDetail;
    classificationSource: string;
    summarySource: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const receiptRef = React.useRef<HTMLElement | null>(null);

  // Maintain photo object URL previews and clean up memory on change/unmount
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);

  const parsedCoords = (() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      latitude.trim() !== '' &&
      longitude.trim() !== '' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  })();

  const handleApplyTemplate = (tmpl: QuickTemplate) => {
    setErrors([]);
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setCategory(tmpl.category);
    setLocationName(tmpl.landmark);
    setLatitude(tmpl.lat);
    setLongitude(tmpl.lng);
  };

  const handleSelectZone = (zoneName: string) => {
    const matched = zones.find((z) => z.name === zoneName);
    if (matched) {
      setLocationName(matched.name);
      setLatitude(matched.latitude.toFixed(5));
      setLongitude(matched.longitude.toFixed(5));
    }
  };

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      setErrors([
        'Browser GPS is not supported on this device. You can click anywhere on the map or select a municipal landmark above.',
      ]);
      return;
    }
    setIsLocating(true);
    setGpsSuccess(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsSuccess(true);
        setErrors([]);
        setTimeout(() => setGpsSuccess(false), 3000);
      },
      () => {
        setIsLocating(false);
        setErrors([
          'GPS permission was denied or timed out. Please click on the map to pin your location or choose a neighborhood landmark.',
        ]);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected: File[] = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const newErrors: string[] = [];
    const validFiles: File[] = [];
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

    for (const file of selected) {
      if (!allowed.includes(file.type)) {
        newErrors.push(`"${file.name}" is not supported. Please attach JPEG, PNG, WebP, or SVG images.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        newErrors.push(`"${file.name}" is over 5 MB. Please select images under 5 MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (photos.length + validFiles.length > 4) {
      newErrors.push('You can attach up to 4 photos per complaint.');
    }

    setErrors(newErrors);
    setPhotos((prev) => [...prev, ...validFiles].slice(0, 4));
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateClientSide = (): string[] => {
    const errs: string[] = [];
    if (title.trim().length < 5) {
      errs.push('Please enter a clear title with at least 5 characters.');
    }
    if (description.trim().length < 12) {
      errs.push('Please provide a brief description of at least 12 characters.');
    }
    if (latitude.trim() === '' || longitude.trim() === '') {
      errs.push('Please pin the location on the map or select a municipal landmark.');
    } else {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errs.push('Latitude must be a valid number between -90 and 90.');
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        errs.push('Longitude must be a valid number between -180 and 180.');
      }
      if (lat === 0 && lng === 0) {
        errs.push('Please select a valid municipal location.');
      }
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validateClientSide();
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('category', category);
      fd.append('locationName', locationName.trim());
      fd.append('latitude', latitude.trim());
      fd.append('longitude', longitude.trim());
      for (const file of photos) {
        fd.append('photos', file);
      }

      const result = await civicApi.submitComplaint(fd);
      setSubmittedResult(result);
      onSubmitted(result.report);
      setTitle('');
      setDescription('');
      setPhotos([]);
      setTimeout(() => {
        receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedResult(null);
    setTitle('');
    setDescription('');
    setCategory('Auto-Detect');
    setLocationName('College Road & Main Gate Corridor');
    setLatitude('12.97214');
    setLongitude('77.59486');
    setPhotos([]);
    setErrors([]);
  };

  return (
    <div className="space-y-6">
      {/* Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                <Shield className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>100% Anonymous Public Intake · No Account Required</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-medium border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" aria-hidden="true" />
                <span>Instant AI Triage & Direct Routing</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Report a Civic Issue in Under 60 Seconds
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              No account, citizen login, or paperwork required. Describe what is broken, drop a pin on the map, and our AI pipeline immediately classifies the problem, detects hazards, and dispatches it to the responsible municipal department.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyTemplate(QUICK_TEMPLATES[0])}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-colors backdrop-blur-sm shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
              <span>Prefill College Road Demo</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Fill Options */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-2.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>Common Civic Issues (1-Tap to Prefill):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-all hover:border-slate-500 hover:text-white"
              >
                <span>{tmpl.label}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Confirmation & AI Triage Receipt */}
      {submittedResult && (
        <section
          ref={receiptRef}
          aria-live="polite"
          className="bg-white border-2 border-emerald-500/80 rounded-2xl p-6 sm:p-7 shadow-md space-y-5 scroll-mt-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Complaint Successfully Registered
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  Tracking ID:{' '}
                  <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    {submittedResult.report.reportId}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Permanently stored in city database. Assigned to{' '}
                  <strong className="text-slate-900">{submittedResult.report.department}</strong> with an initial status of{' '}
                  <strong className="text-slate-900">{submittedResult.report.status}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(submittedResult.report.reportId);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {copiedId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span className="text-emerald-700">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span>Copy Tracking ID</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onTrackId(submittedResult.report.reportId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Compass className="w-4 h-4 text-slate-300" aria-hidden="true" />
                <span>Track Public Status</span>
              </button>

              <button
                type="button"
                onClick={() => onInspectInAdmin(submittedResult.report.reportId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-xs"
              >
                <span>Open in Authority Queue</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Report Another Issue</span>
              </button>
            </div>
          </div>

          {/* AI Triage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                <span>Classification & Routing</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {submittedResult.report.category}
                {submittedResult.report.secondaryCategory && (
                  <span className="text-xs font-normal text-slate-600">
                    {' '}(co-category: {submittedResult.report.secondaryCategory})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600">
                Routed to: <strong className="text-slate-800">{submittedResult.report.department}</strong>
              </div>
              <div className="text-xs pt-1">
                {submittedResult.report.safetyConcern ? (
                  <span className="inline-flex items-center gap-1 text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    Life-Safety Concern Flagged
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Routine municipal repair queue
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Priority Assessment
              </div>
              <PriorityIndicator
                level={submittedResult.report.priorityLevel}
                score={submittedResult.report.priorityScore}
                safetyOverride={submittedResult.report.safetyOverride}
              />
              <div className="font-mono tabular-nums text-[11px] text-slate-500">
                S:{submittedResult.report.severityScore} · U:{submittedResult.report.urgencyScore} · R:{submittedResult.report.recurrenceScore} · I:{submittedResult.report.impactScore}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">
                {submittedResult.report.priorityExplanation.explanations[0]}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Factual Synthesis & Duplicates
              </div>
              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                {submittedResult.report.aiSummary}
              </p>
              <div className="text-[11px] font-medium text-slate-600 pt-1">
                {submittedResult.report.duplicateLinks.length > 0 ? (
                  <span className="text-amber-800">
                    Matched {submittedResult.report.duplicateLinks.length} complaint(s) within 150m.
                  </span>
                ) : (
                  <span className="text-emerald-700">Unique incident in this 150m radius.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Issue details and photos */}
        <div className="lg:col-span-6 space-y-5">
          {/* Section 1: Describe the Issue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">What is the civic issue?</h2>
                <p className="text-xs text-slate-500">Pick a category or let our AI auto-classify it from your description.</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div
                role="alert"
                className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-900 space-y-1.5"
              >
                <div className="font-semibold flex items-center gap-1.5 text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Please check the following before submitting:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-red-700">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visual Category Selection Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Issue Category
              </label>

              {/* Accessible Native Select (synced) */}
              <div className="sr-only">
                <select
                  id="citizen-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CivicCategory | 'Auto-Detect')}
                  aria-label="Civic Category Select"
                >
                  <option value="Auto-Detect">Auto-Detect from Description (AI)</option>
                  {CIVIC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Intuitive visual chip grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Auto-Detect Chip */}
                <button
                  type="button"
                  onClick={() => setCategory('Auto-Detect')}
                  className={`col-span-2 sm:col-span-3 text-left p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                    category === 'Auto-Detect'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="font-semibold">Auto-Detect with AI</span>
                      <span className="text-slate-500 block text-[11px]">Recommended — AI classifies based on your problem text</span>
                    </div>
                  </div>
                  {category === 'Auto-Detect' && (
                    <Check className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                  )}
                </button>

                {CIVIC_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] || AlertTriangle;
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-left p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                      <span className="text-[11px] sm:text-xs leading-tight line-clamp-1">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complaint Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="citizen-title" className="block text-xs font-semibold text-slate-800">
                  Complaint Headline / Title *
                </label>
                <span className="text-[11px] text-slate-400">
                  {title.trim().length >= 5 ? (
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span>Min. 5 characters ({title.trim().length}/5)</span>
                  )}
                </span>
              </div>
              <input
                id="citizen-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep pothole filled with rainwater near College Gate"
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            {/* Problem Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="citizen-description" className="block text-xs font-semibold text-slate-800">
                  Detailed Description *
                </label>
                <span className="text-[11px] text-slate-400">
                  {description.trim().length >= 12 ? (
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span>Min. 12 characters ({description.trim().length}/12)</span>
                  )}
                </span>
              </div>
              <textarea
                id="citizen-description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what is happening, exact landmark or building cues, impact on road users, and whether any immediate safety hazard exists..."
                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Mention if water is pooling, if pedestrians or two-wheelers are endangered, or if power cables are exposed.
              </p>
            </div>
          </div>

          {/* Section 3: Photos & Evidence */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Photographs & Evidence (Optional)</h2>
                <p className="text-xs text-slate-500">Visual proof helps municipal engineers arrive with the exact equipment needed.</p>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 bg-slate-50/70 text-center transition-colors">
              <input
                id="citizen-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                multiple
                onChange={handlePhotoChange}
                className="sr-only"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-100/70 text-blue-700 flex items-center justify-center">
                  <Camera className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <label
                    htmlFor="citizen-photos"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors"
                  >
                    <FileUp className="w-4 h-4 text-slate-600" aria-hidden="true" />
                    <span>Choose Photos from Device</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    JPEG, PNG, WebP, or SVG up to 4 images (max 5 MB each)
                  </p>
                </div>
              </div>

              {/* Photo Previews with Thumbnails */}
              {photos.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2.5">
                    <span>Attached Photos ({photos.length} of 4):</span>
                    <button
                      type="button"
                      onClick={() => setPhotos([])}
                      className="text-slate-500 hover:text-red-700 text-[11px]"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {photos.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden p-1.5 shadow-xs"
                      >
                        <div className="h-24 w-full rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                          {photoPreviews[idx] ? (
                            <img
                              src={photoPreviews[idx]}
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileUp className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="p-1 text-left">
                          <p className="text-[10px] font-medium text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[9px] text-slate-400 tabular-nums">
                            {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          aria-label={`Remove photo ${file.name}`}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors shadow-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                    <span>Analyzing & Registering Complaint...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Civic Complaint</span>
                    <ArrowRight className="w-4 h-4 text-blue-200" aria-hidden="true" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-2.5 text-center">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                <span>Life-threatening emergencies (live power lines on crowds, active fire): also call 112 immediately.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Location Pinning & Map */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900">Where is the issue located? *</h2>
                <p className="text-xs text-slate-500">Pick a neighborhood landmark, use your GPS, or click the map.</p>
              </div>
            </div>

            {/* Quick Landmark Dropdown + GPS button */}
            <div className="space-y-3">
              <div>
                <label htmlFor="citizen-landmark-select" className="block text-xs font-semibold text-slate-800 mb-1">
                  Popular Municipal Landmark / Neighborhood
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    id="citizen-landmark-select"
                    value={locationName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleSelectZone(val);
                      }
                    }}
                    className="flex-1 text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- Choose a recognized municipal zone --</option>
                    {zones.map((zone) => (
                      <option key={zone.name} value={zone.name}>
                        {zone.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleUseBrowserGps}
                    disabled={isLocating}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-xs"
                  >
                    {isLocating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
                        <span>Locating...</span>
                      </>
                    ) : gpsSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">GPS Locked</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                        <span>Use My GPS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Specific Street / Landmark Description */}
              <div>
                <label htmlFor="citizen-landmark" className="block text-xs font-semibold text-slate-800 mb-1">
                  Specific Street Name or Landmark Cues (Optional)
                </label>
                <input
                  id="citizen-landmark"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Opposite City Hospital Gate 2, near bus shelter"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Pin Status Banner */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Pin:{' '}
                    <strong>
                      {locationName ? locationName : 'Interactive Map Coordinate'}
                    </strong>
                  </span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-blue-800 shrink-0">
                  {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                </span>
              </div>

              {/* Collapsible Coordinates Disclosure (accessible & test-friendly) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {showManualCoords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showManualCoords ? 'Hide coordinate inputs' : 'Enter manual latitude & longitude coordinates'}</span>
                </button>

                {showManualCoords && (
                  <div className="grid grid-cols-2 gap-3 pt-2.5">
                    <div>
                      <label htmlFor="citizen-lat" className="block text-xs font-medium text-slate-700 mb-1">
                        Latitude (-90 to 90) *
                      </label>
                      <input
                        id="citizen-lat"
                        type="number"
                        step="0.000001"
                        required
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full font-mono tabular-nums text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="citizen-lng" className="block text-xs font-medium text-slate-700 mb-1">
                        Longitude (-180 to 180) *
                      </label>
                      <input
                        id="citizen-lng"
                        type="number"
                        step="0.000001"
                        required
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full font-mono tabular-nums text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Civic Map Picker */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                  <span>Click anywhere on the map below to move your incident pin</span>
                </span>
                <span className="text-[11px] text-slate-400">Click to pin</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <InteractiveCivicMap
                  reports={existingReports}
                  zones={zones}
                  showHotspots={false}
                  pickerMode={true}
                  pickedCoords={parsedCoords}
                  onPickCoords={(coords) => {
                    setLatitude(coords.latitude.toFixed(6));
                    setLongitude(coords.longitude.toFixed(6));
                  }}
                  heightClass="h-[380px]"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
