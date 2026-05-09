// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, CalendarDays, Users, Settings, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './Sidebar.module.scss';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Shifts', href: '/shifts', icon: CalendarDays },
  { name: 'Participants', href: '/participants', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className={styles.sidebarContainer}>
      
      {/* Brand Header */}
      <div className={styles.brandHeader} onClick={() => router.push('/dashboard')} >
        <Image
          src="/bellvi_logo.png" 
          alt="Bellvi Logo" 
          width={32} 
          height={32} 
          className={styles.logoImage}
        />
        <span className={styles.brandName}>Bellvi</span>
      </div>

      {/* Main Navigation */}
      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link 
                  href={item.href} 
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon className={styles.icon} size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Log Out */}
      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogOut}>
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>

    </aside>
  );
}