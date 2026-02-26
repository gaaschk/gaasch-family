'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

interface Props {
  email: string;
  name:  string | null | undefined;
  role:  string;
}

const ROLE_LINKS: Record<string, { href: string; label: string }[]> = {
  admin:  [
    { href: '/admin',        label: 'Dashboard' },
    { href: '/admin/people', label: 'People' },
    { href: '/admin/families', label: 'Families' },
    { href: '/admin/users',  label: 'Users' },
  ],
  editor: [
    { href: '/admin',          label: 'Dashboard' },
    { href: '/admin/people',   label: 'People' },
    { href: '/admin/families', label: 'Families' },
  ],
  viewer: [
    { href: '/admin', label: 'Dashboard' },
  ],
  pending: [],
};

export default function AccountMenu({ email, name, role }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const links = ROLE_LINKS[role] ?? [];
  const label = name || email;

  return (
    <div ref={ref} className="pub-nav-account-wrap">
      <button
        className="pub-nav-account"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
      </button>

      {open && (
        <div className="pub-nav-dropdown" role="menu">
          {/* Header */}
          <div className="pub-nav-dropdown-header">
            {name && <p className="pub-nav-dropdown-name">{name}</p>}
            <p className="pub-nav-dropdown-email" title={email}>{email}</p>
            <span className={`pub-nav-dropdown-role role-${role}`}>{role}</span>
          </div>

          {/* Role-based links */}
          {links.length > 0 && (
            <div className="pub-nav-dropdown-links">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="pub-nav-dropdown-link"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {role === 'pending' && (
            <p className="pub-nav-dropdown-pending">
              Your account is awaiting admin approval.
            </p>
          )}

          {/* Sign out */}
          <div className="pub-nav-dropdown-footer">
            <button
              className="pub-nav-dropdown-signout"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
