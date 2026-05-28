// src/app/(admin)/layout.tsx
import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import TopHeader from '@/components/TopHeader';
import { Toaster } from 'react-hot-toast';
import styles from '@/app/(worker)/layout.module.scss'; 

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutWrapper}>
      
      {/* Global Toast Notifications */}
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

      {/* Admin specific sidebar */}
      <AdminSidebar />
      
      <div className={styles.mainContentContainer}>
        {/* Reusing the universal Top Header */}
        <TopHeader />
        <main className={styles.appMainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}