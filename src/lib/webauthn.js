// ─── WebAuthn Fast Login Utility ───────────────────────────────────────────
// Uses the native WebAuthn (FIDO2) API — no extra packages needed.
// The device automatically picks Face ID, fingerprint, or PIN depending on
// what's enrolled and available on that hardware.
// Supports multi-device registration tracked in Supabase.

import { supabase } from './supabase';

const STORAGE_KEY = 'sf_fast_login_credential';

// ─── Capability Status Enum ────────────────────────────────────────────────
export const WebAuthnStatus = {
  UNSUPPORTED: 'UNSUPPORTED',                 // Browser has no WebAuthn API
  NO_PLATFORM_AUTHENTICATOR: 'NO_PLATFORM_AUTHENTICATOR', // API exists but no PIN/fingerprint/face
  READY: 'READY',                             // Full support available
};

// ─── Diagnostics ───────────────────────────────────────────────────────────

/** Returns true when the app is running in PWA standalone mode */
export function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** Get the OS from user agent */
function getOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

/** Get the browser name */
function getBrowserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Browser';
}

/**
 * Get a full diagnostic snapshot of the current environment.
 * Useful for debugging cross-platform issues.
 */
export async function getDiagnostics() {
  const hasAPI = !!window.PublicKeyCredential;
  let hasPlatformAuth = false;
  let conditionalMediationSupported = false;

  if (hasAPI) {
    try {
      hasPlatformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch { /* ignore */ }
    try {
      if (PublicKeyCredential.isConditionalMediationAvailable) {
        conditionalMediationSupported = await PublicKeyCredential.isConditionalMediationAvailable();
      }
    } catch { /* ignore */ }
  }

  const localCredential = localStorage.getItem(STORAGE_KEY);

  return {
    timestamp: new Date().toISOString(),
    browser: getBrowserName(),
    os: getOS(),
    userAgent: navigator.userAgent,
    isPWA: isPWA(),
    webAuthnAPI: hasAPI,
    platformAuthenticator: hasPlatformAuth,
    conditionalMediation: conditionalMediationSupported,
    localCredentialStored: !!localCredential,
    localCredentialId: localCredential ? `${localCredential.slice(0, 8)}...` : null,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    isSecureContext: window.isSecureContext,
  };
}

/** Log all diagnostics to console in a structured format */
export async function logDiagnostics() {
  const diag = await getDiagnostics();
  console.group('🔐 Fast Login Diagnostics');
  console.table(diag);
  console.groupEnd();
  return diag;
}

// ─── Capability Detection ──────────────────────────────────────────────────

/** Returns true when the browser supports WebAuthn platform authenticators */
export async function isWebAuthnSupported() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Detailed capability check.
 * @returns {Promise<{status: string, details: string}>}
 *  - status: one of WebAuthnStatus values
 *  - details: human-readable Indonesian explanation
 */
export async function checkWebAuthnCapability() {
  if (!window.PublicKeyCredential) {
    return {
      status: WebAuthnStatus.UNSUPPORTED,
      details: 'Browser ini tidak mendukung Fast Login (WebAuthn).',
    };
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return {
        status: WebAuthnStatus.NO_PLATFORM_AUTHENTICATOR,
        details: 'Untuk menggunakan Fast Login, silakan atur PIN, sidik jari, Face ID, atau Windows Hello pada perangkat Anda terlebih dahulu.',
      };
    }
  } catch {
    return {
      status: WebAuthnStatus.UNSUPPORTED,
      details: 'Gagal memeriksa dukungan autentikasi perangkat.',
    };
  }

  return {
    status: WebAuthnStatus.READY,
    details: 'Perangkat mendukung Fast Login.',
  };
}

// ─── Auth Method Labels ────────────────────────────────────────────────────

/** Returns a friendly label for the expected method based on user agent */
export function getAuthMethodLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'Face ID / Touch ID';
  if (/android/.test(ua)) return 'Sidik Jari / PIN';
  if (/mac/.test(ua)) return 'Touch ID';
  return 'Windows Hello / PIN';
}

/** Extract a human-readable device name from navigator */
export function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const match = ua.match(/;\s*([^;)]+)\s*Build/);
    return match ? match[1].trim() : 'Android Device';
  }
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

// ─── Error Handling ────────────────────────────────────────────────────────

/**
 * Map a WebAuthn error to a human-readable Indonesian message.
 * @param {Error} error
 * @returns {{ title: string, message: string, recoverable: boolean }}
 */
export function getWebAuthnErrorMessage(error) {
  if (!error) {
    return {
      title: 'Kesalahan',
      message: 'Terjadi kesalahan yang tidak diketahui.',
      recoverable: true,
    };
  }

  // Custom application errors
  if (error.message === 'CREDENTIAL_REVOKED') {
    return {
      title: 'Kredensial Dihapus',
      message: 'Fast Login telah dihapus oleh admin. Silakan login dengan ID & Kata Sandi.',
      recoverable: false,
    };
  }

  if (error.message === 'CREDENTIAL_DEACTIVATED') {
    return {
      title: 'Fast Login Dinonaktifkan',
      message: 'Fast Login dinonaktifkan oleh admin. Hubungi administrator.',
      recoverable: false,
    };
  }

  if (error.message === 'No credential registered') {
    return {
      title: 'Belum Terdaftar',
      message: 'Belum ada kredensial Fast Login. Silakan login dengan ID & Kata Sandi terlebih dahulu.',
      recoverable: false,
    };
  }

  // WebAuthn standard errors
  switch (error.name) {
    case 'NotAllowedError':
      return {
        title: 'Dibatalkan',
        message: 'Autentikasi dibatalkan atau ditolak oleh pengguna.',
        recoverable: true,
      };

    case 'InvalidStateError':
      return {
        title: 'Status Tidak Valid',
        message: 'Kredensial sudah terdaftar pada perangkat ini. Hapus yang lama terlebih dahulu.',
        recoverable: false,
      };

    case 'SecurityError':
      return {
        title: 'Kesalahan Keamanan',
        message: 'Operasi diblokir oleh kebijakan keamanan browser. Pastikan Anda menggunakan HTTPS.',
        recoverable: false,
      };

    case 'AbortError':
      return {
        title: 'Dibatalkan',
        message: 'Operasi autentikasi dibatalkan. Silakan coba lagi.',
        recoverable: true,
      };

    case 'NotSupportedError':
      return {
        title: 'Tidak Didukung',
        message: 'Jenis kredensial yang diminta tidak didukung oleh perangkat ini.',
        recoverable: false,
      };

    case 'TypeError':
      return {
        title: 'Kesalahan Konfigurasi',
        message: 'Terjadi kesalahan pada konfigurasi autentikasi. Hubungi administrator.',
        recoverable: false,
      };

    case 'ConstraintError':
      return {
        title: 'Batasan Perangkat',
        message: 'Perangkat tidak memenuhi persyaratan autentikasi. Pastikan PIN/sidik jari/Face ID sudah diatur.',
        recoverable: false,
      };

    default:
      return {
        title: 'Gagal',
        message: `Fast Login gagal: ${error.message || 'Kesalahan tidak diketahui'}. Gunakan ID & Kata Sandi.`,
        recoverable: true,
      };
  }
}

// ─── Credential Status ─────────────────────────────────────────────────────

/** True if a credential has already been registered on this device (local check) */
export function hasFastLoginLocal() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** Legacy alias */
export function hasFastLogin() {
  return hasFastLoginLocal();
}

/**
 * Combined local + DB check for passkey registration status.
 * @returns {Promise<{registered: boolean, source: 'local'|'db'|'none', credentialId: string|null}>}
 */
export async function checkPasskeyRegistered() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return { registered: false, source: 'none', credentialId: null };
  }

  try {
    const { data, error } = await supabase
      .from('fast_login_devices')
      .select('id, is_active, credential_id')
      .eq('credential_id', stored)
      .single();

    if (error || !data) {
      // Credential in localStorage but not in DB — stale data
      console.warn('🔐 Local credential not found in DB, clearing stale data');
      localStorage.removeItem(STORAGE_KEY);
      return { registered: false, source: 'none', credentialId: null };
    }

    if (!data.is_active) {
      // Credential exists but was deactivated by admin
      console.warn('🔐 Credential deactivated by admin');
      return { registered: false, source: 'db', credentialId: stored };
    }

    return { registered: true, source: 'db', credentialId: stored };
  } catch {
    // Network error — trust local state as offline fallback
    console.warn('🔐 Network error during credential check, using local state');
    return { registered: true, source: 'local', credentialId: stored };
  }
}

/**
 * Sync fast login status: check if the locally stored credential is still
 * active in the database. If admin revoked it, clear localStorage.
 * @returns {boolean} true if credential is valid and active
 */
export async function syncFastLoginStatus() {
  const result = await checkPasskeyRegistered();
  if (!result.registered && result.source === 'none') {
    return false;
  }
  return result.registered;
}

/** Clear the stored credential (logout / forget this device) */
export function clearFastLogin() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clear local credential AND remove it from the database
 */
export async function clearFastLoginWithDB() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    await supabase
      .from('fast_login_devices')
      .delete()
      .eq('credential_id', stored);
  }
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Encoding Helpers ──────────────────────────────────────────────────────

/** Helper — convert base64url to Uint8Array */
function b64ToBuffer(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Helper — convert ArrayBuffer to base64url string */
function bufferToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ─── Registration & Authentication ─────────────────────────────────────────

/**
 * Register a new WebAuthn credential on this device.
 * Saves to both localStorage and Supabase fast_login_devices table.
 * Uses excludeCredentials to prevent duplicate registration.
 * @returns {boolean} true on success
 */
export async function registerCredential() {
  console.log('🔐 Starting credential registration...');
  const diag = await getDiagnostics();
  console.log('🔐 Environment:', diag);

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  // Build excludeCredentials list to prevent duplicate registration
  const excludeCredentials = [];
  const existingCredential = localStorage.getItem(STORAGE_KEY);
  if (existingCredential) {
    excludeCredentials.push({
      type: 'public-key',
      id: b64ToBuffer(existingCredential),
      transports: ['internal'],
    });
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'SELF FINDER Admin',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: 'admin@self-finder',
        displayName: 'Admin',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',  // use device biometric / PIN
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  });

  // Persist the credential ID
  const credentialId = bufferToB64(credential.rawId);
  localStorage.setItem(STORAGE_KEY, credentialId);

  // Also persist to database for admin tracking
  const deviceLabel = `${getDeviceName()} — ${getBrowserName()}`;
  const { error } = await supabase.from('fast_login_devices').insert([{
    device_name: deviceLabel,
    credential_id: credentialId,
  }]);

  if (error) {
    console.error('🔐 Failed to save credential to DB:', error);
    // Don't throw — local registration still succeeded
  }

  console.log('🔐 Credential registered successfully:', {
    credentialId: `${credentialId.slice(0, 8)}...`,
    device: deviceLabel,
  });

  return true;
}

/**
 * Authenticate using an existing WebAuthn credential.
 * Also updates last_used_at in the database.
 * @returns {boolean} true if the device verified the user successfully
 */
export async function authenticateCredential() {
  console.log('🔐 Starting credential authentication...');

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('No credential registered');

  // First check if credential is still active in DB
  let device = null;
  try {
    const { data, error: dbError } = await supabase
      .from('fast_login_devices')
      .select('id, is_active')
      .eq('credential_id', stored)
      .single();

    if (dbError || !data) {
      console.warn('🔐 Credential not found in DB');
      localStorage.removeItem(STORAGE_KEY);
      throw new Error('CREDENTIAL_REVOKED');
    }

    if (!data.is_active) {
      console.warn('🔐 Credential deactivated');
      localStorage.removeItem(STORAGE_KEY);
      throw new Error('CREDENTIAL_DEACTIVATED');
    }

    device = data;
  } catch (err) {
    // Re-throw our custom errors
    if (err.message === 'CREDENTIAL_REVOKED' || err.message === 'CREDENTIAL_DEACTIVATED') {
      throw err;
    }
    // Network error — allow offline auth attempt
    console.warn('🔐 DB check failed (network?), attempting local auth anyway');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        { type: 'public-key', id: b64ToBuffer(stored), transports: ['internal'] },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  // Update last_used_at (best effort, don't fail if this errors)
  if (device) {
    supabase
      .from('fast_login_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', device.id)
      .then(({ error }) => {
        if (error) console.warn('🔐 Failed to update last_used_at:', error);
      });
  }

  console.log('🔐 Authentication successful');
  return true;
}
