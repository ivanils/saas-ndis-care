// src/components/SuperAdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Building2, Users, Settings, LogOut, ShieldAlert } from 'lucide-react';
import styles from './SuperAdminSidebar.module.scss';

export default function SuperAdminSidebar() {
  const pathname = usePathname();

  // Define super admin navigation routes
  const navItems = [
    { name: 'Platform Overview', path: '/superadmin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Manage Agencies', path: '/superadmin/agencies', icon: <Building2 size={20} /> },
    { name: 'Global Users', path: '/superadmin/users', icon: <Users size={20} /> },
    { name: 'System Logs', path: '/superadmin/logs', icon: <ShieldAlert size={20} /> },
    { name: 'Global Settings', path: '/superadmin/settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <Building2 size={28} color="#38BDF8" />
        </div>
        <h2>Bellvi SaaS</h2>
      </div>

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
        Sign Out
      </button>
    </aside>
  );
}