import React, { useState } from 'react';
import { X, Shield, Lock, Layers, Download, Link as LinkIcon, Key, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (filename: string) => void;
  onError: (msg: string) => void;
}

export const GoogleDriveImportModal: React.FC<GoogleDriveImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onError,
}) => {
  const [driveUrlOrId, setDriveUrlOrId] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrlOrId.trim()) {
      setErrorMsg('Please enter a Google Drive link or File ID.');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMsg(null);
      setImportStep('Connecting to Google Drive & fetching byte stream...');

      const stepTimer1 = setTimeout(() => {
        setImportStep('Applying Fernet AES-128-CBC encryption...');
      }, 700);

      const stepTimer2 = setTimeout(() => {
        setImportStep('Partitioning into 3 shards & computing SHA-256 digests...');
      }, 1400);

      const result = await api.importGoogleDrive({
        drive_url_or_id: driveUrlOrId.trim(),
        custom_filename: customFilename.trim() || undefined,
        access_token: accessToken.trim() || undefined,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setImportStep('Finalizing SQLite metadata & securing storage...');

      setTimeout(() => {
        setIsImporting(false);
        setDriveUrlOrId('');
        setCustomFilename('');
        setAccessToken('');
        onImportSuccess(result.filename);
        onClose();
      }, 500);
    } catch (err: any) {
      setIsImporting(false);
      const msg = err.message || 'Failed to import from Google Drive.';
      setErrorMsg(msg);
      onError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-vault-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-vault-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {/* Google Drive Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M7.74 3L1.5 13.8L5.16 20.14L11.4 9.34L7.74 3Z" fill="#0066DA" />
                <path d="M16.26 3L7.74 3L11.4 9.34L19.92 9.34L16.26 3Z" fill="#00AC47" />
                <path d="M22.5 13.8L16.26 3L12.6 9.34L18.84 20.14L22.5 13.8Z" fill="#EA4335" />
                <path d="M18.84 20.14L11.4 20.14L7.74 13.8L15.18 13.8L18.84 20.14Z" fill="#FFBA00" />
                <path d="M11.4 9.34L5.16 20.14L1.5 13.8L7.74 3L11.4 9.34Z" fill="#2684FC" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Import from Google Drive</h3>
              <p className="text-xs text-slate-400">Fetch cloud files into TriVault's 3-shard encryption vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Concept Banner */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-vault-cyan/20 flex items-start space-x-2.5 text-xs text-cyan-200">
            <Shield className="w-4 h-4 text-vault-cyan shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-vault-cyan">Zero-Knowledge Defense: </span>
              Files on Google Drive can be scanned or subpoenaed. TriVault downloads your file, immediately encrypts it using Fernet (AES-128-CBC + HMAC-SHA256), and partitions it across 3 physical shards.
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleImport} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drive URL or File ID Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Google Drive Share Link or File ID *</span>
              <span className="text-[10px] text-vault-cyan font-normal">Public or "Anyone with link"</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={driveUrlOrId}
                onChange={(e) => setDriveUrlOrId(e.target.value)}
                placeholder="https://drive.google.com/file/d/1BxiMVs0XRA5.../view or File ID"
                disabled={isImporting}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-vault-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-vault-cyan focus:ring-1 focus:ring-vault-cyan disabled:opacity-50"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Accepts share links (<code className="text-slate-300">/file/d/...</code>, <code className="text-slate-300">?id=...</code>) or raw File IDs.
            </p>
          </div>

          {/* Custom Filename (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Custom Filename <span className="text-slate-500 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="e.g. project_proposal.pdf (defaults to Google Drive filename)"
              disabled={isImporting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-vault-cyan focus:ring-1 focus:ring-vault-cyan disabled:opacity-50"
            />
          </div>

          {/* Advanced / OAuth Token Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-vault-cyan flex items-center space-x-1 transition-colors"
            >
              <span>{showAdvanced ? '▾ Hide Private Access / OAuth Settings' : '▸ Private File / Google OAuth Token (Optional)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-3 rounded-xl bg-vault-950/70 border border-slate-800 space-y-2 animate-in fade-in duration-150">
                <label className="text-[11px] font-medium text-slate-300 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-vault-cyan" />
                  <span>Google OAuth Access Token</span>
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Bearer ya29.a0AfH6SM..."
                  disabled={isImporting}
                  className="w-full px-3 py-2 rounded-lg bg-vault-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-vault-cyan disabled:opacity-50 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Optional. Only required if the file is private to your Google Workspace account and not shared publicly.
                </p>
              </div>
            )}
          </div>

          {/* Progress Animation */}
          {isImporting && (
            <div className="p-4 rounded-xl bg-vault-cyan/5 border border-vault-cyan/20 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center space-x-2.5 text-xs text-vault-cyan font-mono">
                <div className="w-4 h-4 border-2 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin" />
                <span>{importStep}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-vault-cyan animate-pulse rounded-full w-4/5" />
              </div>
            </div>
          )}

          {/* Pipeline Notice */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-vault-950/80 border border-slate-800 text-center text-[10px]">
              <Lock className="w-3.5 h-3.5 mx-auto text-vault-cyan mb-1" />
              <span className="text-slate-300 font-medium">1. Fernet AES</span>
              <p className="text-[9px] text-slate-500">128-bit CBC</p>
            </div>
            <div className="p-2 rounded-lg bg-vault-950/80 border border-slate-800 text-center text-[10px]">
              <Layers className="w-3.5 h-3.5 mx-auto text-vault-cyan mb-1" />
              <span className="text-slate-300 font-medium">2. 3 Shards</span>
              <p className="text-[9px] text-slate-500">Partitioned</p>
            </div>
            <div className="p-2 rounded-lg bg-vault-950/80 border border-slate-800 text-center text-[10px]">
              <Shield className="w-3.5 h-3.5 mx-auto text-vault-cyan mb-1" />
              <span className="text-slate-300 font-medium">3. Manifest</span>
              <p className="text-[9px] text-slate-500">SHA-256 Verified</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!driveUrlOrId.trim() || isImporting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Import & Encrypt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
