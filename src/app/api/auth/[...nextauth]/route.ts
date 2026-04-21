import { handlers } from '@/lib/auth';

// NextAuth сам створить GET і POST endpoints для:
// /api/auth/signin, /api/auth/signout, /api/auth/callback/google,
// /api/auth/session, /api/auth/csrf, /api/auth/providers
export const { GET, POST } = handlers;