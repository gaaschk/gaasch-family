import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Admin</h1>
      <p>Signed in as {user.email}</p>
      <p>
        Admin dashboard — people editor, family editor, and audit log coming soon.
      </p>
    </main>
  );
}
