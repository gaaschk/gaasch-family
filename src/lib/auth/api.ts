// Lightweight authentication API helpers for PR1
// Note: These are stubs intended for MVP wiring. Replace with real API calls in a follow-up PR.

export async function signUp(data: { email: string; password: string }): Promise<boolean> {
  if (!data.email || !data.password) throw new Error('Invalid signup data');
  return true;
}

export async function login(data: { email: string; password: string }): Promise<boolean> {
  if (!data.email || !data.password) throw new Error('Invalid credentials');
  return true;
}

export async function sendForgotPassword(data: { email: string }): Promise<void> {
  if (!data.email) throw new Error('Email required');
  // Mock email flow in tests
}

export async function setPassword(data: { password: string }): Promise<void> {
  if (!data.password) throw new Error('Password required');
}
