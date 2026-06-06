// src/components/SuperAdminSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Building2, Users, Settings, LogOut, ShieldAlert, Menu, X } from 'lucide-react';
import styles from './SuperAdminSidebar.module.scss';

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Define super admin navigation routes
  const navItems = [
    { name: 'Platform Overview', path: '/superadmin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Manage Agencies', path: '/superadmin/agencies', icon: <Building2 size={20} /> },
    { name: 'Global Users', path: '/superadmin/users', icon: <Users size={20} /> },
    { name: 'System Logs', path: '/superadmin/logs', icon: <ShieldAlert size={20} /> },
    { name: 'Global Settings', path: '/superadmin/settings', icon: <Settings size={20} /> },
  ];

  // Close the sidebar automatically when the route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
    };
    handleRouteChange();
  }, [pathname]);

  // Lock body scroll when the mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {/* --- MOBILE FLOATING ACTION BUTTON --- */}
      <button
        className={styles.mobileToggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* --- DARK OVERLAY --- */}
      {isOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <Link href="/superadmin/dashboard" className={styles.logoContainer}>
          <Image
            src="/bellvi_logo.png"
            alt="Bellvi Logo"
            width={32}
            height={32}
            className={styles.logoImage}
          />
          <h2>Bellvi SaaS</h2>
          <span className={styles.superAdminBadge}>SA</span>

        </Link>

        <nav className={styles.navMenu}>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`${styles.navItem} ${pathname.includes(item.path) ? styles.active : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
          Log Out
        </button>
      </aside>
    </>
  );
}