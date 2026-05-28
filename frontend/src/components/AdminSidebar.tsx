// src/components/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Users, ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './AdminSidebar.module.scss';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: 'Rostering',
      path: '/admin/rostering',
      icon: <CalendarDays size={20} />,
    },
    {
      name: 'Staff',
      path: '/admin/staff',
      icon: <Users size={20} />,
    },
    {
      name: 'Compliance',
      path: '/admin/compliance',
      icon: <ShieldAlert size={20} />,
    },
  ];

  // Handle user logout and redirection
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <aside className={styles.sidebarContainerAdmin}>
      
      {/* Brand Header */}
      <div className={styles.brandHeader}>
        <Image
          src="/bellvi_logo.png" 
          alt="Bellvi Logo" 
          width={32} 
          height={32} 
          className={styles.logoImage}
        />
        <span className={styles.brandName}>Bellvi</span>
        <span className={styles.adminBadge}>Admin</span>
      </div>

      {/* Navigation Links */}
      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            
            return (
              <li key={item.name}>
                <Link 
                  href={item.path} 
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>

    </aside>
  );
}