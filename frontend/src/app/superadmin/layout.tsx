// src/app/superadmin/layout.tsx
import React from 'react';
import SuperAdminSidebar from '@/components/SuperAdminSidebar';
import TopHeader from '@/components/TopHeader';
import { Toaster } from 'react-hot-toast';
import styles from './layout.module.scss'; 

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutContainer}>
      <SuperAdminSidebar />
      <div className={styles.mainContent}>
        <TopHeader />
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}