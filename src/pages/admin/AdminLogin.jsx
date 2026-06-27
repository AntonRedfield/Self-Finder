import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import {
  Loader2, ShieldCheck, Fingerprint, KeyRound, X, Info,
  AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Smartphone,
  Monitor, CheckCircle2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import {
  isWebAuthnSupported,
  hasFastLogin,
  registerCredential,
  authenticateCredential,
  checkWebAuthnCapability,
  checkPasskeyRegistered,
  getAuthMethodLabel,
  getWebAuthnErrorMessage,
  getDiagnostics,
  WebAuthnStatus,
} from '../../lib/webauthn';

// ─── State Machine ─────────────────────────────────────────────────────────
const State = {
  INITIALIZING:           'INITIALIZING',
  UNSUPPORTED_BROWSER:    'UNSUPPORTED_BROWSER',
  NO_PLATFORM_AUTH:       'NO_PLATFORM_AUTH',
  PASSKEY_NOT_REGISTERED: 'PASSKEY_NOT_REGISTERED',
  PASSKEY_READY:          'PASSKEY_READY',
  AUTHENTICATING:         'AUTHENTICATING',
  AUTH_FAILED:            'AUTH_FAILED',
  AUTH_SUCCESS:           'AUTH_SUCCESS',
  REGISTERING:            'REGISTERING',
};

export default function AdminLogin() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State machine
  const [machineState, setMachineState] = useState(State.INITIALIZING);
  const [authMethod, setAuthMethod] = useState('');
  const [capability, setCapability] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [errorShake, setErrorShake] = useState(false);
  const [authError, setAuthError] = useState(null); // { title, message, recoverable }
  const [successFlash, setSuccessFlash] = useState(false);

  const { isAdminAuthenticated, adminLogin, adminLoginDirect } = useStore();
  const errorTimeoutRef = useRef(null);

  // ── Initialize: check capabilities ───────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const cap = await checkWebAuthnCapability();
        setCapability(cap);

        if (cap.status === WebAuthnStatus.UNSUPPORTED) {
          setMachineState(State.UNSUPPORTED_BROWSER);
          return;
        }

        if (cap.status === WebAuthnStatus.NO_PLATFORM_AUTHENTICATOR) {
          setMachineState(State.NO_PLATFORM_AUTH);
          return;
        }

        // WebAuthn is READY — check if passkey is registered
        setAuthMethod(getAuthMethodLabel());
        const passkeyStatus = await checkPasskeyRegistered();

        if (passkeyStatus.registered) {
          setMachineState(State.PASSKEY_READY);
        } else {
          setMachineState(State.PASSKEY_NOT_REGISTERED);
        }
      } catch (err) {
        console.error('🔐 Init error:', err);
        setMachineState(State.UNSUPPORTED_BROWSER);
      }
    };
    init();
  }, []);

  // ── Load diagnostics on demand ───────────────────────────────────
  const loadDiagnostics = useCallback(async () => {
    const diag = await getDiagnostics();
    setDiagnostics(diag);
  }, []);

  // Redirect if already authenticated
  if (isAdminAuthenticated && !successFlash) {
    return <Navigate to="/admin/dashboard" />;
  }

  // ── Trigger error shake animation ────────────────────────────────
  const triggerError = (msg, webAuthnErr = null) => {
    if (webAuthnErr) {
      setAuthError(webAuthnErr);
      setError(webAuthnErr.message);
    } else {
      setAuthError(null);
      setError(msg);
    }
    setErrorShake(true);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setErrorShake(false), 500);
  };

  // ── Password Login ──────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAuthError(null);
    setTimeout(() => {
      const success = adminLogin(id, password);
      if (!success) {
        triggerError('ID atau Kata Sandi salah.');
        setLoading(false);
        return;
      }
      // Successful password login
      if (capability?.status === WebAuthnStatus.READY && machineState === State.PASSKEY_NOT_REGISTERED) {
        // Offer fast login setup
        setLoading(false);
        setShowSetupModal(true);
      } else {
        setLoading(false);
      }
    }, 600);
  };

  // ── Biometric / Fast Login ──────────────────────────────────────
  const handleFastLogin = async () => {
    setMachineState(State.AUTHENTICATING);
    setBiometricLoading(true);
    setError('');
    setAuthError(null);
    try {
      await authenticateCredential();
      setMachineState(State.AUTH_SUCCESS);
      setSuccessFlash(true);
      // Brief success animation before redirect
      setTimeout(() => {
        adminLoginDirect();
        // Reset successFlash so the Navigate guard can redirect
        setSuccessFlash(false);
      }, 300);
    } catch (err) {
      console.error('🔐 Auth error:', err);
      const errInfo = getWebAuthnErrorMessage(err);

      if (!errInfo.recoverable) {
        // Credential revoked/deactivated/missing — fall back to password
        setMachineState(State.PASSKEY_NOT_REGISTERED);
        setShowPasswordForm(false);
      } else {
        setMachineState(State.AUTH_FAILED);
      }
      triggerError(null, errInfo);
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── Register Credential ────────────────────────────────────────
  const handleSetupFastLogin = async () => {
    setMachineState(State.REGISTERING);
    setBiometricLoading(true);
    try {
      await registerCredential();
      setMachineState(State.PASSKEY_READY);
      setShowSetupModal(false);
    } catch (err) {
      console.error('🔐 Registration error:', err);
      const errInfo = getWebAuthnErrorMessage(err);
      if (err.name !== 'NotAllowedError') {
        triggerError(null, errInfo);
      }
      setShowSetupModal(false);
      // Revert to the appropriate state
      if (isAdminAuthenticated) {
        setMachineState(State.PASSKEY_NOT_REGISTERED);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── Retry fast login from error state ──────────────────────────
  const handleRetry = () => {
    setError('');
    setAuthError(null);
    setMachineState(State.PASSKEY_READY);
  };

  // ── Fingerprint Icon SVG ───────────────────────────────────────
  const FingerprintIcon = ({ size = 64, className = '' }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 17c1 .5 2.5 1.1 4 1" />
      <path d="M22 12c0 .34-.01.67-.03 1" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M14 5a6 6 0 0 1 5.13 8.98" />
    </svg>
  );

  // ── Device Icon based on OS ────────────────────────────────────
  const DeviceIcon = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|Android/.test(ua)) return <Smartphone size={14} />;
    return <Monitor size={14} />;
  };

  // ── Info Banner Component ──────────────────────────────────────
  const InfoBanner = ({ icon: Icon, variant = 'info', children }) => {
    const variants = {
      info: 'bg-blue-50 border-blue-100 text-blue-700',
      warning: 'bg-amber-50 border-amber-100 text-amber-700',
      error: 'bg-red-50 border-red-100 text-red-600',
      success: 'bg-green-50 border-green-100 text-green-700',
    };
    return (
      <div className={`rounded-xl p-3 text-sm border flex items-start gap-2 animate-fade-in ${variants[variant]}`}>
        {Icon && <Icon size={16} className="shrink-0 mt-0.5" />}
        <div className="flex-1">{children}</div>
      </div>
    );
  };

  // ── Diagnostics Panel ──────────────────────────────────────────
  const DiagnosticsPanel = () => (
    <div className="w-full mt-4">
      <button
        onClick={() => {
          if (!showDiagnostics) loadDiagnostics();
          setShowDiagnostics(!showDiagnostics);
        }}
        className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 transition-colors mx-auto"
      >
        <Info size={12} />
        Diagnostik
        {showDiagnostics ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {showDiagnostics && diagnostics && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-[10px] text-gray-400 font-mono space-y-0.5 animate-fade-in">
          <p>Browser: {diagnostics.browser}</p>
          <p>OS: {diagnostics.os}</p>
          <p>PWA: {diagnostics.isPWA ? 'Ya' : 'Tidak'}</p>
          <p>WebAuthn: {diagnostics.webAuthnAPI ? '✓' : '✗'}</p>
          <p>Platform Auth: {diagnostics.platformAuthenticator ? '✓' : '✗'}</p>
          <p>Credential: {diagnostics.localCredentialStored ? diagnostics.localCredentialId : 'Tidak ada'}</p>
          <p>Secure: {diagnostics.isSecureContext ? '✓' : '✗'}</p>
          <p>Host: {diagnostics.hostname}</p>
        </div>
      )}
    </div>
  );

  // ── INITIALIZING state ─────────────────────────────────────────
  if (machineState === State.INITIALIZING) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Memeriksa keamanan perangkat...</p>
        </div>
      </div>
    );
  }

  // ── AUTH_SUCCESS state ─────────────────────────────────────────
  if (machineState === State.AUTH_SUCCESS) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-8 flex flex-col items-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-green-700 mb-1">Berhasil!</h1>
          <p className="text-sm text-gray-500">Mengarahkan ke dasbor...</p>
        </div>
      </div>
    );
  }

  // ── PASSKEY_READY / AUTHENTICATING / AUTH_FAILED — Fast Login Screen ──
  if (
    machineState === State.PASSKEY_READY ||
    machineState === State.AUTHENTICATING ||
    machineState === State.AUTH_FAILED
  ) {
    if (!showPasswordForm) {
      return (
        <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 flex flex-col items-center animate-slide-up">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img src="/logo-square.svg" alt="SELF FINDER Logo" className="h-48 w-auto object-contain" />
            </div>

            <h1 className="text-2xl font-bold text-primary tracking-tight mb-1">Selamat Datang</h1>
            <p className="text-sm text-text-dark mb-8 text-center">Verifikasi identitas Anda untuk melanjutkan</p>

            {/* Biometric Button */}
            <button
              id="fast-login-button"
              onClick={handleFastLogin}
              disabled={machineState === State.AUTHENTICATING}
              className={`w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition-all duration-300 active:scale-95 group mb-4 ${
                machineState === State.AUTH_FAILED
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40'
              } ${machineState !== State.AUTHENTICATING && machineState !== State.AUTH_FAILED ? 'animate-pulse-glow' : ''}`}
            >
              {machineState === State.AUTHENTICATING ? (
                <Loader2 size={56} className="text-primary animate-spin" />
              ) : machineState === State.AUTH_FAILED ? (
                <AlertTriangle size={56} className="text-red-400" />
              ) : (
                <FingerprintIcon
                  size={56}
                  className="text-primary group-hover:scale-110 transition-transform duration-200"
                />
              )}
              <div className="text-center">
                <p className={`font-bold text-base ${
                  machineState === State.AUTH_FAILED ? 'text-red-500' : 'text-primary'
                }`}>
                  {machineState === State.AUTHENTICATING
                    ? 'Memverifikasi...'
                    : machineState === State.AUTH_FAILED
                      ? 'Verifikasi Gagal'
                      : 'Masuk Cepat'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {machineState === State.AUTH_FAILED ? 'Ketuk untuk coba lagi' : authMethod}
                </p>
              </div>
            </button>

            {/* Error Message */}
            {(error || authError) && (
              <div className={`w-full mb-3 ${errorShake ? 'animate-shake' : ''}`}>
                <InfoBanner icon={AlertTriangle} variant="error">
                  <p className="font-semibold text-xs">{authError?.title || 'Gagal'}</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </InfoBanner>
              </div>
            )}

            {/* Retry button for failed state */}
            {machineState === State.AUTH_FAILED && authError?.recoverable && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/70 transition-colors mb-3 font-semibold"
              >
                <RefreshCw size={14} />
                Coba Lagi
              </button>
            )}

            {/* Fallback to password */}
            <button
              onClick={() => { setShowPasswordForm(true); setError(''); setAuthError(null); }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors mt-2"
            >
              <KeyRound size={14} />
              Gunakan ID &amp; Kata Sandi
            </button>

            {/* Device info chip */}
            <div className="flex items-center gap-1.5 mt-5 px-3 py-1.5 rounded-full bg-gray-50 text-[10px] text-gray-400">
              <DeviceIcon />
              <span>{authMethod}</span>
              <span className="w-1 h-1 rounded-full bg-green-400" />
              <span>Siap</span>
            </div>

            <DiagnosticsPanel />
            <Footer className="mt-6 pt-4 border-t border-gray-100" />
          </div>
        </div>
      );
    }
  }

  // ── Normal Password Login Screen ───────────────────────────────
  // Shown for: UNSUPPORTED_BROWSER, NO_PLATFORM_AUTH, PASSKEY_NOT_REGISTERED,
  // or when user clicks "Use ID & Password" from fast login screen
  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-6 flex flex-col items-center animate-slide-up relative">

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img src="/logo-square.svg" alt="SELF FINDER Logo" className="h-64 w-auto object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-primary tracking-tight mb-2">Portal Admin</h1>
        <p className="text-sm text-text-dark mb-6 text-center">Silakan masuk untuk mengelola sistem.</p>

        {/* Status banners based on state */}
        {machineState === State.UNSUPPORTED_BROWSER && (
          <div className="w-full mb-4">
            <InfoBanner icon={Info} variant="info">
              <p className="text-xs">Fast Login tidak didukung di browser ini. Gunakan Chrome, Edge, atau Safari terbaru untuk fitur ini.</p>
            </InfoBanner>
          </div>
        )}

        {machineState === State.NO_PLATFORM_AUTH && (
          <div className="w-full mb-4">
            <InfoBanner icon={AlertTriangle} variant="warning">
              <p className="text-xs font-semibold mb-0.5">Fast Login Belum Tersedia</p>
              <p className="text-xs">{capability?.details || 'Silakan atur PIN, sidik jari, Face ID, atau Windows Hello pada perangkat Anda terlebih dahulu.'}</p>
            </InfoBanner>
          </div>
        )}

        {/* Non-recoverable auth error banner */}
        {authError && !authError.recoverable && machineState === State.PASSKEY_NOT_REGISTERED && (
          <div className={`w-full mb-4 ${errorShake ? 'animate-shake' : ''}`}>
            <InfoBanner icon={AlertTriangle} variant="warning">
              <p className="text-xs font-semibold mb-0.5">{authError.title}</p>
              <p className="text-xs">{authError.message}</p>
            </InfoBanner>
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label htmlFor="admin-id" className="block text-sm font-medium mb-1">ID Admin</label>
            <input
              id="admin-id"
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              className="input-field"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium mb-1">Kata Sandi</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>
          {error && !authError && (
            <p className={`text-red-500 text-sm font-medium text-center ${errorShake ? 'animate-shake' : ''}`}>
              {error}
            </p>
          )}
          <Button type="submit" id="login-submit-button" className="w-full h-12 flex justify-center items-center" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Masuk'}
          </Button>
        </form>

        {/* Show fast login button if passkey is ready and user came from password form */}
        {machineState === State.PASSKEY_READY && showPasswordForm && (
          <button
            onClick={() => { setShowPasswordForm(false); setError(''); setAuthError(null); }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/70 transition-colors mt-5 font-semibold"
          >
            <Fingerprint size={16} />
            Gunakan Fast Login
          </button>
        )}

        <DiagnosticsPanel />
        <Footer className="mt-8 pt-6 border-t border-gray-100" />
      </div>

      {/* ── Setup Fast Login Modal ─────────────────────────────── */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-scale-in">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Aktifkan Fast Login?</h3>
              <p className="text-sm text-gray-500 mb-2">
                Masuk lebih cepat di perangkat ini menggunakan:
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
                <Fingerprint size={16} className="text-primary" />
                <p className="text-sm font-bold text-primary">{authMethod}</p>
              </div>

              {/* Benefits list */}
              <div className="w-full text-left space-y-2 mb-6">
                {[
                  'Login 1 ketukan, tanpa perlu mengetik',
                  'Keamanan tingkat perangkat',
                  'Terikat perangkat ini saja',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 size={14} className="text-secondary shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 mb-5">
                Anda dapat mengelola Fast Login di halaman Pengaturan → Keamanan.
              </p>

              <div className="w-full space-y-3">
                <Button
                  onClick={handleSetupFastLogin}
                  disabled={biometricLoading}
                  id="setup-fast-login-button"
                  className="w-full h-12 flex justify-center items-center gap-2"
                >
                  {biometricLoading ? <Loader2 className="animate-spin" size={18} /> : <Fingerprint size={18} />}
                  {biometricLoading ? 'Menyiapkan...' : 'Ya, Aktifkan'}
                </Button>
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Nanti saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
