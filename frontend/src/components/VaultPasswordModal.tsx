import React, { useState } from 'react';
import { Lock, Key, Shield, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

interface VaultPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'set' | 'change' | 'remove';
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const VaultPasswordModal: React.FC<VaultPasswordModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSuccess,
  onError,
}) => {
  const [vaultPassword, setVaultPassword] = useState('');
  const [confirmVaultPassword, setConfirmVaultPassword] = useState('');
  const [currentVaultPassword, setCurrentVaultPassword] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'set') {
      if (vaultPassword.length < 4) {
        setErrorMsg('Vault password/PIN must be at least 4 characters.');
        return;
      }
      if (vaultPassword !== confirmVaultPassword) {
        setErrorMsg('Vault passwords do not match.');
        return;
      }
      if (!accountPassword) {
        setErrorMsg('Please enter your account password to verify identity.');
        return;
      }

      try {
        setIsLoading(true);
        const res = await api.setVaultPassword({
          vault_password: vaultPassword,
          account_password: accountPassword,
        });
        setIsLoading(false);
        onSuccess(res.message || 'Vault password set successfully.');
        resetForm();
        onClose();
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to set vault password.');
        onError(err.message || 'Failed to set vault password.');
      }
    } else if (mode === 'change') {
      if (!currentVaultPassword) {
        setErrorMsg('Please enter your current vault password.');
        return;
      }
      if (vaultPassword.length < 4) {
        setErrorMsg('New vault password must be at least 4 characters.');
        return;
      }
      if (vaultPassword !== confirmVaultPassword) {
        setErrorMsg('New vault passwords do not match.');
        return;
      }

      try {
        setIsLoading(true);
        const res = await api.changeVaultPassword({
          current_vault_password: currentVaultPassword,
          new_vault_password: vaultPassword,
        });
        setIsLoading(false);
        onSuccess(res.message || 'Vault password changed successfully.');
        resetForm();
        onClose();
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to change vault password.');
        onError(err.message || 'Failed to change vault password.');
      }
    } else if (mode === 'remove') {
      if (!accountPassword) {
        setErrorMsg('Please enter your account password to confirm removal.');
        return;
      }

      try {
        setIsLoading(true);
        const res = await api.removeVaultPassword(accountPassword);
        setIsLoading(false);
        onSuccess(res.message || 'Vault password removed.');
        resetForm();
        onClose();
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to remove vault password.');
        onError(err.message || 'Failed to remove vault password.');
      }
    }
  };

  const resetForm = () => {
    setVaultPassword('');
    setConfirmVaultPassword('');
    setCurrentVaultPassword('');
    setAccountPassword('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-vault-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-vault-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {mode === 'set' && 'Set File Vault Password'}
                {mode === 'change' && 'Change Vault Password'}
                {mode === 'remove' && 'Remove Vault Password'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'set' && 'Add password protection to lock document visibility'}
                {mode === 'change' && 'Update your secret vault access PIN/password'}
                {mode === 'remove' && 'Disable password requirement for file vault'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Concept Note */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-start space-x-2.5 text-xs text-amber-200/90">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Vault Privacy Shield: </span>
              Your File Vault requires this separate password to reveal filenames, metadata, and download controls on this device.
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'change' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Current Vault Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentVaultPassword}
                  onChange={(e) => setCurrentVaultPassword(e.target.value)}
                  placeholder="Enter current vault password"
                  required
                  disabled={isLoading}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-vault-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'set' || mode === 'change') && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {mode === 'set' ? 'Vault Password / PIN *' : 'New Vault Password / PIN *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Enter vault secret password (min 4 chars)"
                    required
                    disabled={isLoading}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-vault-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm Vault Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmVaultPassword}
                  onChange={(e) => setConfirmVaultPassword(e.target.value)}
                  placeholder="Re-type vault password"
                  required
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </>
          )}

          {(mode === 'set' || mode === 'remove') && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Password (Identity Check) *</span>
              </label>
              <input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Enter your account login password"
                required
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-500">
                Confirm your account password to ensure only authorized owners can modify vault security.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2 ${
                mode === 'remove'
                  ? 'bg-rose-400 hover:bg-rose-300'
                  : 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Processing...'
                  : mode === 'set'
                  ? 'Set & Lock Vault'
                  : mode === 'change'
                  ? 'Update Password'
                  : 'Remove Password'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
