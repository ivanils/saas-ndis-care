// src/app/(app)/layout.tsx
import React from 'react';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import styles from './layout.module.scss'; 
import { Toaster } from 'react-hot-toast';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutWrapper}>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }} 
      />
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