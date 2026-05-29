// src/app/(superadmin)/logs/page.tsx
import styles from '../superadmin.module.scss';
import { ShieldAlert } from 'lucide-react';

export default function LogsPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <h1>System Logs & Security</h1>
          <p>Global audit trail for authentication and security events.</p>
        </div>
      </div>
      <div className={styles.tablePanel} style={{ padding: '64px', textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
        <h3 style={{ color: 'var(--text-dark)' }}>Audit Logging Module</h3>
        <p style={{ color: 'var(--text-muted)' }}>This feature will connect to Supabase Auth logs in a future release.</p>
      </div>
    </div>
  );
}