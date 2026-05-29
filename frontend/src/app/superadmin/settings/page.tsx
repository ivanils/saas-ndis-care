// src/app/(superadmin)/settings/page.tsx
import styles from '../superadmin.module.scss';
import { Settings } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <h1>Global Settings</h1>
          <p>Platform-wide configurations and feature flags.</p>
        </div>
      </div>
      <div className={styles.tablePanel} style={{ padding: '64px', textAlign: 'center' }}>
        <Settings size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
        <h3 style={{ color: 'var(--text-dark)' }}>Platform Configuration</h3>
        <p style={{ color: 'var(--text-muted)' }}>Global API keys, billing configurations, and webhooks will be managed here.</p>
      </div>
    </div>
  );
}