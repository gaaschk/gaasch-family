// Lightweight session helper (no external deps)
export type Session = {
  userId: string;
  email: string;
  token?: string;
  exp?: number;
};

export function createSession(user: { id: string; email: string }): Session {
  return { userId: user.id, email: user.email, token: undefined };
}

export function isAuthenticated(req: any): boolean {
  // Simple heuristic; replace with real session check (cookie, header)
  return Boolean(req?.headers?.authorization || req?.cookies?.session);
}

export function signOut(): void {
  // placeholder: client-side cookie purge in real app
}

export function withAuthGuard(handler: any) {
  return async (req: any, res: any) => {
    if (!isAuthenticated(req)) {
      res.status(302).setHeader('Location', '/login');
      return { done: true };
    }
    return handler(req, res);
  };
}
