// ─── WebAuthn Fast Login Utility ───────────────────────────────────────────
// Uses the native WebAuthn (FIDO2) API — no extra packages needed.
// The device automatically picks Face ID, fingerprint, or PIN depending on
// what's enrolled and available on that hardware.
// Supports multi-device registration tracked in Supabase.

import { supabase } from './supabase';

const STORAGE_KEY = 'sf_fast_login_credential';

/** Returns true when the app is running in PWA standalone mode */
export function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** Returns true when the browser supports WebAuthn platform authenticators */
export async function isWebAuthnSupported() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

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
  // Try to extract useful device info
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

/** Get the browser name */
function getBrowserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Browser';
}

/** True if a credential has already been registered on this device (local check) */
export function hasFastLoginLocal() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** Legacy alias */
export function hasFastLogin() {
  return hasFastLoginLocal();
}

/**
 * Sync fast login status: check if the locally stored credential is still
 * active in the database. If admin revoked it, clear localStorage.
 * @returns {boolean} true if credential is valid and active
 */
export async function syncFastLoginStatus() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;

  try {
    const { data, error } = await supabase
      .from('fast_login_devices')
      .select('id, is_active')
      .eq('credential_id', stored)
      .single();

    if (error || !data || !data.is_active) {
      // Credential was revoked or deleted by admin
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    // Network error — keep local state as-is (offline fallback)
    return !!stored;
  }
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

/**
 * Register a new WebAuthn credential on this device.
 * Saves to both localStorage and Supabase fast_login_devices table.
 * @returns {boolean} true on success
 */
export async function registerCredential() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

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
  await supabase.from('fast_login_devices').insert([{
    device_name: deviceLabel,
    credential_id: credentialId,
  }]);

  return true;
}

/**
 * Authenticate using an existing WebAuthn credential.
 * Also updates last_used_at in the database.
 * @returns {boolean} true if the device verified the user successfully
 */
export async function authenticateCredential() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('No credential registered');

  // First check if credential is still active in DB
  const { data: device, error: dbError } = await supabase
    .from('fast_login_devices')
    .select('id, is_active')
    .eq('credential_id', stored)
    .single();

  if (dbError || !device) {
    localStorage.removeItem(STORAGE_KEY);
    throw new Error('CREDENTIAL_REVOKED');
  }

  if (!device.is_active) {
    localStorage.removeItem(STORAGE_KEY);
    throw new Error('CREDENTIAL_DEACTIVATED');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        { type: 'public-key', id: b64ToBuffer(stored) },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  // Update last_used_at
  await supabase
    .from('fast_login_devices')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', device.id);

  // If the above doesn't throw, the device verified the user successfully
  return true;
}
