// ─── WebAuthn Fast Login Utility ───────────────────────────────────────────
// Uses the native WebAuthn (FIDO2) API — no extra packages needed.
// The device automatically picks Face ID, fingerprint, or PIN depending on
// what's enrolled and available on that hardware.

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

/** True if a credential has already been registered on this device */
export function hasFastLogin() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** Clear the stored credential (logout / forget this device) */
export function clearFastLogin() {
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
 * Call this after a successful password login in PWA mode.
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

  // Persist the credential ID so we can use it for future authentications
  const credentialId = bufferToB64(credential.rawId);
  localStorage.setItem(STORAGE_KEY, credentialId);
  return true;
}

/**
 * Authenticate using an existing WebAuthn credential.
 * @returns {boolean} true if the device verified the user successfully
 */
export async function authenticateCredential() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('No credential registered');

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

  // If the above doesn't throw, the device verified the user successfully
  return true;
}
