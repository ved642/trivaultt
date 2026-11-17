import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StoredFile } from '../types';
import {
  HardDrive,
  UploadCloud,
  FileText,
  Search,
  Download,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
  Lock,
  Key,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { FileUploadModal } from '../components/FileUploadModal';
import { GoogleDriveImportModal } from '../components/GoogleDriveImportModal';
import { ShardInspectionModal } from '../components/ShardInspectionModal';
import { RenameModal } from '../components/RenameModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { VaultPasswordModal } from '../components/VaultPasswordModal';
import { ToastContainer } from '../components/Toast';
import { ToastMessage } from '../types';

export const FileManagerPage: React.FC = () => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vault Lock & Password States
  const [hasVaultPassword, setHasVaultPassword] = useState<boolean>(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('trivault_vault_unlocked') === 'true';
  });
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [vaultModalMode, setVaultModalMode] = useState<'set' | 'change' | 'remove' | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);
  const [shardInspectFile, setShardInspectFile] = useState<StoredFile | null>(null);
  const [renameTargetFile, setRenameTargetFile] = useState<StoredFile | null>(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState<StoredFile | null>(null);
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

  const checkVaultStatus = async () => {
    try {
      const status = await api.getVaultStatus();
      setHasVaultPassword(status.has_vault_password);
      if (!status.has_vault_password) {
        setIsVaultUnlocked(true);
        sessionStorage.setItem('trivault_vault_unlocked', 'true');
        fetchFiles(searchQuery);
      } else {
        const wasUnlocked = sessionStorage.getItem('trivault_vault_unlocked') === 'true';
        if (wasUnlocked) {
          setIsVaultUnlocked(true);
          fetchFiles(searchQuery);
        } else {
          setIsVaultUnlocked(false);
          setIsLoading(false);
        }
      }
    } catch {
      // Fallback
      fetchFiles(searchQuery);
    }
  };

  const fetchFiles = async (search?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.listFiles(search);
      setFiles(res.files);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve files.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkVaultStatus();
  }, []);

  useEffect(() => {
    if (isVaultUnlocked) {
      fetchFiles(searchQuery);
    }
  }, [searchQuery, isVaultUnlocked]);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) return;

    try {
      setIsUnlocking(true);
      setUnlockError(null);
      await api.verifyVaultPassword(unlockPassword);
      setIsUnlocking(false);
      setIsVaultUnlocked(true);
      sessionStorage.setItem('trivault_vault_unlocked', 'true');
      setUnlockPassword('');
      addToast('success', 'File Vault unlocked successfully.');
      fetchFiles(searchQuery);
    } catch (err: any) {
      setIsUnlocking(false);
      setUnlockError(err.message || 'Incorrect vault password. Access denied.');
    }
  };

  const handleLockVault = () => {
    sessionStorage.removeItem('trivault_vault_unlocked');
    setIsVaultUnlocked(false);
    setFiles([]);
    setUnlockPassword('');
    setUnlockError(null);
    addToast('info', 'File Vault locked.');
  };

  const handleDownload = async (file: StoredFile) => {
    try {
      addToast('info', `Reassembling 3 shards for ${file.filename}...`);
      await api.downloadFile(file.id, file.filename);
      addToast('success', `${file.filename} decrypted and downloaded.`);
    } catch (err: any) {
      addToast('error', err.message || 'Download failed.');
    }
  };

  const handleRename = async (fileId: number, newName: string) => {
    await api.renameFile(fileId, newName);
    addToast('success', `File renamed to "${newName}".`);
    fetchFiles(searchQuery);
  };

  const handleDelete = async (fileId: number) => {
    await api.deleteFile(fileId);
    addToast('success', 'File and its 3 shards permanently deleted.');
    fetchFiles(searchQuery);
  };

  // Sorting
  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortBy === 'name') {
      return sortOrder === 'asc'
        ? a.filename.localeCompare(b.filename)
        : b.filename.localeCompare(a.filename);
    }
    if (sortBy === 'size') {
      return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
    }
    return 0;
  });

  const toggleSort = (type: 'date' | 'name' | 'size') => {
    if (sortBy === type) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('asc');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // If Vault is Password Protected and currently locked, show Lock Screen
  if (hasVaultPassword && !isVaultUnlocked) {
    return (
      <div className="space-y-6 max-w-lg mx-auto py-12">
        <div className="p-8 sm:p-10 rounded-3xl bg-vault-900 border border-slate-800 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Lock Icon */}
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_40px_rgba(245,158,11,0.2)]">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">File Vault Locked</h1>
            <p className="text-xs text-slate-400 font-mono">
              Your stored document names, sizes, and shards are protected. Enter your Vault Password to unlock.
            </p>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4">
            {unlockError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <div className="relative">
              <input
                type={showUnlockPassword ? 'text' : 'password'}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Enter Vault Password / PIN"
                required
                autoFocus
                disabled={isUnlocking}
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-vault-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isUnlocking || !unlockPassword}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{isUnlocking ? 'Unlocking Vault...' : 'Unlock File Vault'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-center space-x-3">
            <span>Forgot Vault Password?</span>
            <button
              onClick={() => setVaultModalMode('remove')}
              className="text-amber-400 hover:underline font-medium"
            >
              Reset with Account Password
            </button>
          </div>
        </div>

        <VaultPasswordModal
          isOpen={vaultModalMode !== null}
          mode={vaultModalMode || 'set'}
          onClose={() => setVaultModalMode(null)}
          onSuccess={(msg) => {
            addToast('success', msg);
            checkVaultStatus();
          }}
          onError={(msg) => addToast('error', msg)}
        />

        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-vault-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Encrypted File Vault</h1>
            {hasVaultPassword ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>UNLOCKED</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono">
                NO PIN SET
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Manage your personal files. Shards are stored separately on disk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-vault-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-vault-cyan transition-colors"
            />
          </div>

          <button
            onClick={() => fetchFiles(searchQuery)}
            title="Refresh File Vault"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Vault Security / Lock Button */}
          {hasVaultPassword ? (
            <>
              <button
                onClick={handleLockVault}
                title="Lock File Vault Immediately"
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs transition-all flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Vault</span>
              </button>
              <button
                onClick={() => setVaultModalMode('change')}
                title="Change Vault Password"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-400" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setVaultModalMode('set')}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 font-semibold text-xs shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all flex items-center space-x-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Set Vault Password</span>
            </button>
          )}

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-vault-cyan hover:bg-vault-cyanGlow text-slate-950 font-semibold text-xs shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => setIsGoogleDriveOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 font-semibold text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all flex items-center space-x-2"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
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

      {/* Security Tip Banner if no Vault Password is set */}
      {!hasVaultPassword && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center space-x-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Lock Your File Vault:</strong> Set a dedicated Vault Password/PIN so that document details and downloads are kept locked whenever you step away.
            </span>
          </div>
          <button
            onClick={() => setVaultModalMode('set')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-sm"
          >
            Set Password Now
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Table Card */}
      <div className="bg-vault-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs font-mono">
            <div className="w-8 h-8 border-2 border-vault-cyan/30 border-t-vault-cyan rounded-full animate-spin mx-auto mb-3" />
            Querying SQLite File Registry & Verifying Storage Root...
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-vault-950 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
              <HardDrive className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base text-slate-200 font-medium">No encrypted files found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? `No files matching "${searchQuery}". Try clearing the search filter.`
                  : 'Your vault is ready. Upload or import a file to begin.'}
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-xl bg-vault-cyan/10 hover:bg-vault-cyan/20 text-vault-cyan border border-vault-cyan/30 text-xs font-semibold transition-all"
              >
                Upload a File
              </button>
              <button
                onClick={() => setIsGoogleDriveOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
              >
                Import from Drive
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-vault-950/70 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800 select-none">
                <tr>
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-3.5 px-6 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>File Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('size')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Original Size</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Partitioning</th>
                  <th
                    onClick={() => toggleSort('date')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Upload Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {sortedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-6 font-medium text-slate-200 flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-vault-cyan/10 border border-vault-cyan/20 flex items-center justify-center text-vault-cyan shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate max-w-xs">
                        <p className="truncate text-slate-200 font-semibold">{file.filename}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{file.content_type}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-300">{formatFileSize(file.size)}</td>
                    <td className="py-4 px-4 font-mono">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        3 Shards (Fernet)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">{formatDate(file.created_at)}</td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      {/* Inspect Shards */}
                      <button
                        onClick={() => setShardInspectFile(file)}
                        title="Cryptographic Shard Inspector (SHA-256 Manifest)"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-vault-cyan/10 text-slate-400 hover:text-vault-cyan border border-slate-700 hover:border-vault-cyan/30 transition-all inline-flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(file)}
                        title="Reassemble 3 shards and decrypt file"
                        className="p-1.5 rounded-lg bg-vault-cyan/10 hover:bg-vault-cyan/20 text-vault-cyan border border-vault-cyan/30 transition-all inline-flex items-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Rename */}
                      <button
                        onClick={() => setRenameTargetFile(file)}
                        title="Rename File"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all inline-flex items-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTargetFile(file)}
                        title="Delete File and its 3 Shards"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchFiles(searchQuery);
          addToast('success', 'File encrypted, sharded into 3, and saved to vault.');
        }}
        onError={(msg) => addToast('error', msg)}
        onOpenGoogleDrive={() => setIsGoogleDriveOpen(true)}
      />

      <GoogleDriveImportModal
        isOpen={isGoogleDriveOpen}
        onClose={() => setIsGoogleDriveOpen(false)}
        onImportSuccess={(filename) => {
          fetchFiles(searchQuery);
          addToast('success', `"${filename}" imported from Google Drive, encrypted, and sharded.`);
        }}
        onError={(msg) => addToast('error', msg)}
      />

      <ShardInspectionModal
        file={shardInspectFile}
        isOpen={!!shardInspectFile}
        onClose={() => setShardInspectFile(null)}
      />

      <RenameModal
        file={renameTargetFile}
        isOpen={!!renameTargetFile}
        onClose={() => setRenameTargetFile(null)}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        file={deleteTargetFile}
        isOpen={!!deleteTargetFile}
        onClose={() => setDeleteTargetFile(null)}
        onConfirm={handleDelete}
      />

      <VaultPasswordModal
        isOpen={vaultModalMode !== null}
        mode={vaultModalMode || 'set'}
        onClose={() => setVaultModalMode(null)}
        onSuccess={(msg) => {
          addToast('success', msg);
          checkVaultStatus();
        }}
        onError={(msg) => addToast('error', msg)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
