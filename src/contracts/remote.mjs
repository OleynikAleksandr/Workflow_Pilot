// Remote access through Tailscale Serve: shared names and limits. The gateway
// listens on loopback only; Serve publishes it inside the owner's tailnet.
export const REMOTE_PREFERRED_PORT = 18854;
export const REMOTE_DEVICE_COOKIE = 'wp_device';
export const REMOTE_PAIRING_TTL_MS = 5 * 60 * 1000;
export const REMOTE_PAIRING_ATTEMPTS_PER_MINUTE = 6;
export const REMOTE_MAX_DEVICES = 16;
// Identity headers set by Tailscale Serve for tailnet users (never by clients:
// Serve strips client-supplied copies).
export const TAILSCALE_LOGIN_HEADER = 'tailscale-user-login';
export const TAILSCALE_NAME_HEADER = 'tailscale-user-name';

export function remoteError(code, message) {
  return Object.assign(new Error(message ?? code), { code });
}

// A Tailscale MagicDNS name of this machine, without a trailing dot.
export function tailnetHostName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\.$/, '').toLowerCase();
  return /^[a-z0-9]([a-z0-9-]{0,62})(\.[a-z0-9]([a-z0-9-]{0,62}))*\.ts\.net$/.test(name) && name.length <= 253 ? name : null;
}

export function deviceName(value) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
  return name || null;
}
