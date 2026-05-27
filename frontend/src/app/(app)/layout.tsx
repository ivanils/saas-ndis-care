// src/app/(app)/layout.tsx
import React from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import styles from './layout.module.scss'; // Importamos el nuevo SCSS

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutWrapper}>
      <Sidebar />
      
      <div className={styles.mainContentContainer}>
        <TopHeader />
        <main className={styles.appMainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}