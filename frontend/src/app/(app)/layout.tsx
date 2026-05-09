// src/app/(app)/layout.tsx
import React from 'react';
import Sidebar from '../components/Sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      
      {/* Our new Sidebar component */}
      <Sidebar />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* TODO: Here we will inject the <TopHeader /> component later */}
        
        <main style={{ padding: '32px 48px', flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}