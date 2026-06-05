// src/app/not-found.tsx
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import styles from './error-page.module.scss';

export default function NotFound() {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorCard}>
        <div className={`${styles.iconWrapper} ${styles.missing}`}>
          <FileQuestion size={64} strokeWidth={1.5} />
        </div>
        
        <h2 className={styles.title}>404 - Page Not Found</h2>
        <p className={styles.description}>
          The page you are looking for does not exist, has been moved, or you do not have the permissions to view it.
        </p>
        
        <div className={styles.buttonGroup}>
          <Link href="/" className="btn-primary" style={{ justifyContent: 'center' }}>
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}