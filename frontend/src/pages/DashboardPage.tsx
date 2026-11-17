import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  HardDrive,
  Layers,
  UploadCloud,
  FileText,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  FolderLock,
} from 'lucide-react';
import { FileUploadModal } from '../components/FileUploadModal';
import { GoogleDriveImportModal } from '../components/GoogleDriveImportModal';
import { ToastContainer } from '../components/Toast';
import { ToastMessage } from '../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalSizeBytes, setTotalSizeBytes] = useState<number>(0);
  const [hasVaultPassword, setHasVaultPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [summary, vaultStatus] = await Promise.all([
        api.getFileSummary(),
        api.getVaultStatus().catch(() => ({ has_vault_password: false })),
      ]);
      setTotalCount(summary.total_count);
      setTotalSizeBytes(summary.total_size_bytes);
      setHasVaultPassword(vaultStatus.has_vault_password);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-vault-900 via-vault-850 to-vault-900 border border-slate-800 card-glow">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Welcome back, {user?.username}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              VAULT ACTIVE
            </span>
            {hasVaultPassword && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>PIN LOCKED</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Every stored file is encrypted with Fernet and distributed across 3 ordered shards.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            title="Refresh dashboard metrics"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-semibold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New File</span>
          </button>
          <button
            onClick={() => setIsGoogleDriveModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 font-semibold text-sm shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all flex items-center space-x-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M7.74 3L1.5 13.8L5.16 20.14L11.4 9.34L7.74 3Z" fill="#0066DA" />
              <path d="M16.26 3L7.74 3L11.4 9.34L19.92 9.34L16.26 3Z" fill="#00AC47" />
              <path d="M22.5 13.8L16.26 3L12.6 9.34L18.84 20.14L22.5 13.8Z" fill="#EA4335" />
              <path d="M18.84 20.14L11.4 20.14L7.74 13.8L15.18 13.8L18.84 20.14Z" fill="#FFBA00" />
              <path d="M11.4 9.34L5.16 20.14L1.5 13.8L7.74 3L11.4 9.34Z" fill="#2684FC" />
            </svg>
            <span>Import from Drive</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Cards — Derived strictly from real backend database */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Files Card */}
        <div className="p-5 rounded-2xl bg-vault-900 border border-slate-800 space-y-3 card-glow-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Encrypted Files</span>
            <div className="w-8 h-8 rounded-lg bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white font-mono">{totalCount}</span>
            <span className="text-xs text-slate-500 font-mono">records in SQLite</span>
          </div>
        </div>

        {/* Total Storage Used */}
        <div className="p-5 rounded-2xl bg-vault-900 border border-slate-800 space-y-3 card-glow-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Original Data Size</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white font-mono">{formatFileSize(totalSizeBytes)}</span>
            <span className="text-xs text-slate-500 font-mono">unencrypted bytes</span>
          </div>
        </div>

        {/* Shard Multiplication Metric */}
        <div className="p-5 rounded-2xl bg-vault-900 border border-slate-800 space-y-3 card-glow-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Encrypted Shards</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-emerald-400 font-mono">{totalCount * 3}</span>
            <span className="text-xs text-slate-500 font-mono">physical .enc files</span>
          </div>
        </div>
      </div>

      {/* Confidentiality Shield Card — File details are strictly hidden from Home Page */}
      <div className="p-8 rounded-2xl bg-vault-900 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-vault-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-vault-cyan/10 border border-vault-cyan/30 flex items-center justify-center text-vault-cyan">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Confidential Document Shield Active
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Document names, sizes, and file records are strictly protected from the Home Dashboard.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              To prevent shoulder-surfing and unauthorized inspection, your document list and cryptographic shards are isolated inside the <strong className="text-white">File Vault</strong>. Access your vault with authentication and optional password lock.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-vault-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Plaintext on Dashboard</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-vault-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{hasVaultPassword ? 'Vault Password Active' : 'Vault Password Protection Available'}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-vault-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Layers className="w-4 h-4 text-vault-cyan" />
                <span>3-Shard Disk Isolation</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => navigate('/files')}
              className="px-6 py-3.5 rounded-xl bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center space-x-2"
            >
              <FolderLock className="w-4 h-4" />
              <span>Open Protected File Vault</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-3.5 h-3.5 text-vault-cyan" />
              <span>Add New Encrypted File</span>
            </button>
          </div>
        </div>

        {/* Defense-in-Depth Pipeline Architecture */}
        <div className="pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
            TriVault Defense-in-Depth Architecture
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-vault-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-vault-cyan font-bold">STAGE 1</span>
              <h4 className="text-xs font-semibold text-white">Fernet AES-128</h4>
              <p className="text-[11px] text-slate-400">Authenticated 128-bit CBC encryption with HMAC-SHA256 signature.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-vault-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-vault-cyan font-bold">STAGE 2</span>
              <h4 className="text-xs font-semibold text-white">3-Shard Partition</h4>
              <p className="text-[11px] text-slate-400">Ciphertext sliced into 3 separate physical disk shards.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-vault-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-vault-cyan font-bold">STAGE 3</span>
              <h4 className="text-xs font-semibold text-white">SHA-256 Manifest</h4>
              <p className="text-[11px] text-slate-400">Precomputed digests verify integrity before any reassembly.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-vault-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-amber-400 font-bold">STAGE 4</span>
              <h4 className="text-xs font-semibold text-white">Vault Gatekeeper</h4>
              <p className="text-[11px] text-slate-400">Dedicated password locks document visibility inside File Vault.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Toasts */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          loadDashboardData();
          addToast('success', 'File encrypted, sharded into 3 files, and saved to your Vault.');
        }}
        onError={(msg) => addToast('error', msg)}
        onOpenGoogleDrive={() => setIsGoogleDriveModalOpen(true)}
      />

      <GoogleDriveImportModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        onImportSuccess={(filename) => {
          loadDashboardData();
          addToast('success', `"${filename}" imported from Google Drive, encrypted, and sharded.`);
        }}
        onError={(msg) => addToast('error', msg)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
