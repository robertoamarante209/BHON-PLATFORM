import type { User } from '../types';

type UserRole = User['role'];

function intendedPath(loginLocation: string): string | null {
  const queryIndex = loginLocation.indexOf('?');
  if (queryIndex === -1) return null;

  const next = new URLSearchParams(loginLocation.slice(queryIndex + 1)).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}

export function resolvePostLoginPath(role: UserRole, loginLocation: string): string {
  const fallback = role === 'PLATFORM_OWNER' ? '/platform/overview' : '/clinic/overview';
  const next = intendedPath(loginLocation);
  if (!next) return fallback;

  const allowedPrefix = role === 'PLATFORM_OWNER' ? '/platform/' : '/clinic/';
  return next.startsWith(allowedPrefix) ? next : fallback;
}
