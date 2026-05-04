import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Loader2, ShieldCheck, Fingerprint, KeyRound, ArrowLeft, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import {
  isWebAuthnSupported,
  hasFastLogin,
  registerCredential,
  authenticateCredential,
  syncFastLoginStatus,
  getAuthMethodLabel,
} from '../../lib/webauthn';

export default function AdminLogin() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fast login state
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);
  const [fastLoginReady, setFastLoginReady] = useState(false);
  const [showFastLogin, setShowFastLogin] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState('');
  const [initialChecking, setInitialChecking] = useState(true);

  const { isAdminAuthenticated, adminLogin, adminLoginDirect } = useStore();

  useEffect(() => {
    const init = async () => {
      const supported = await isWebAuthnSupported();
      setWebAuthnAvailable(supported);

      if (supported) {
        setAuthMethod(getAuthMethodLabel());

        // Check local + sync with DB (admin might have revoked)
        const hasLocal = hasFastLogin();
        if (hasLocal) {
          const stillValid = await syncFastLoginStatus();
          setFastLoginReady(stillValid);
          setShowFastLogin(stillValid);
        } else {
          setFastLoginReady(false);
        }
      }
      setInitialChecking(false);
    };
    init();
  }, []);

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" />;
  }

  // ── Password Login ──────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const success = adminLogin(id, password);
      if (!success) {
        setError('ID atau Kata Sandi salah.');
        setLoading(false);
        return;
      }
      // Successful password login — offer fast login setup if available but not yet set up
      if (webAuthnAvailable && !fastLoginReady) {
        setLoading(false);
        setShowSetupModal(true);
      } else {
        setLoading(false);
      }
    }, 600);
  };

  // ── Biometric / Fast Login ──────────────────────────────────────
  const handleFastLogin = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      await authenticateCredential();
      // Biometric verified + credential active in DB → authenticate directly
      adminLoginDirect();
    } catch (err) {
      if (err.message === 'CREDENTIAL_REVOKED') {
        setError('Kredensial Fast Login telah dihapus oleh admin. Silakan login dengan ID & Kata Sandi.');
        setFastLoginReady(false);
        setShowFastLogin(false);
      } else if (err.message === 'CREDENTIAL_DEACTIVATED') {
        setError('Fast Login dinonaktifkan oleh admin. Hubungi administrator.');
        setFastLoginReady(false);
        setShowFastLogin(false);
      } else if (err.name === 'NotAllowedError') {
        setError('Autentikasi dibatalkan atau ditolak.');
      } else {
        setError('Fast Login gagal. Gunakan ID & Kata Sandi.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── Register Credential after first login ──────────────────────
  const handleSetupFastLogin = async () => {
    setBiometricLoading(true);
    try {
      await registerCredential();
      setFastLoginReady(true);
      setShowSetupModal(false);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError('Gagal menyiapkan Fast Login. Coba lagi nanti.');
      }
      setShowSetupModal(false);
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── Fingerprint Icon SVG (inline, no dep) ──────────────────────
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

  // ── Loading state while checking credential ────────────────────
  if (initialChecking) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  // ── Fast Login Screen ──────────────────────────────────────────
  if (showFastLogin) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
        <div className="card w-full max-w-sm flex flex-col items-center animate-slide-up shadow-xl shadow-primary/5">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img src="/logo-square.svg" alt="SELF FINDER Logo" className="h-48 w-auto object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-primary tracking-tight mb-1">Selamat Datang</h1>
          <p className="text-sm text-text-dark mb-8 text-center">Verifikasi identitas Anda untuk melanjutkan</p>

          {/* Biometric Button */}
          <button
            onClick={handleFastLogin}
            disabled={biometricLoading}
            className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 active:scale-95 group mb-4"
          >
            {biometricLoading ? (
              <Loader2 size={56} className="text-primary animate-spin" />
            ) : (
              <FingerprintIcon size={56} className="text-primary group-hover:scale-110 transition-transform duration-200" />
            )}
            <div className="text-center">
              <p className="font-bold text-primary text-base">
                {biometricLoading ? 'Memverifikasi...' : 'Masuk Cepat'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{authMethod}</p>
            </div>
          </button>

          {error && <p className="text-red-500 text-sm font-medium text-center mb-3">{error}</p>}

          {/* Fallback to password */}
          <button
            onClick={() => { setShowFastLogin(false); setError(''); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors mt-2"
          >
            <KeyRound size={14} />
            Gunakan ID &amp; Kata Sandi
          </button>

          <Footer className="mt-8 pt-6 border-t border-gray-100" />
        </div>
      </div>
    );
  }

  // ── Normal Password Login Screen ───────────────────────────────
  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="card w-full max-w-sm flex flex-col items-center animate-slide-up shadow-xl shadow-primary/5 relative">

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img src="/logo-square.svg" alt="SELF FINDER Logo" className="h-64 w-auto object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-primary tracking-tight mb-2">Portal Admin</h1>
        <p className="text-sm text-text-dark mb-8 text-center">Silakan masuk untuk mengelola sistem.</p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID Admin</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 flex justify-center items-center" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Masuk'}
          </Button>
        </form>

        {/* Show fast login button if already set up */}
        {webAuthnAvailable && fastLoginReady && (
          <button
            onClick={() => { setShowFastLogin(true); setError(''); }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/70 transition-colors mt-5 font-semibold"
          >
            <Fingerprint size={16} />
            Gunakan Fast Login
          </button>
        )}

        <Footer className="mt-8 pt-6 border-t border-gray-100" />
      </div>

      {/* ── Setup Fast Login Modal ─────────────────────────────── */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-slide-up">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 mb-6">
                <p className="text-sm font-bold text-primary">{authMethod}</p>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Fast Login terikat pada perangkat ini saja. Anda dapat mengelolanya di halaman Pengaturan.
              </p>

              <div className="w-full space-y-3">
                <Button
                  onClick={handleSetupFastLogin}
                  disabled={biometricLoading}
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
