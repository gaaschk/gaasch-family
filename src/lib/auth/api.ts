// Lightweight authentication API helpers for PR1
// NOTE: These are stubs intended for MVP wiring. Replace with real API calls in a follow-up PR.

export async function signUp(data: { email: string; password: string }): Promise<boolean> {
  // Simulate a successful signup; in real use, POST to /signup
  if (!data.email || !data.password) throw new Error('Invalid signup data');
  return true;
}

export async function login(data: { email: string; password: string }): Promise<boolean> {
  // Simulate a successful login; in real use, POST to /login
  if (!data.email || !data.password) throw new Error('Invalid credentials');
  return true;
}

export async function sendForgotPassword(data: { email: string }): Promise<void> {
  if (!data.email) throw new Error('Email required');
  // In tests, this should trigger a mocked email flow
}

export async function setPassword(data: { password: string }): Promise<void> {
  if (!data.password) throw new Error('Password required');
}
