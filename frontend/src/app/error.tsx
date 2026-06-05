// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';
import styles from './error-page.module.scss';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {

    useEffect(() => {
        console.error('Bellvi Application Error Caught:', error);
    }, [error]);

    return (
        <div className={styles.errorContainer}>
            <div className={styles.errorCard}>
                <div className={`${styles.iconWrapper} ${styles.critical}`}>
                    <AlertOctagon size={64} strokeWidth={1.5} />
                </div>

                <h2 className={styles.title}>Something went wrong!</h2>
                <p className={styles.description}>
                    We encountered an unexpected error while processing your request.
                    Our engineering team has been notified of the issue.
                </p>

                <div className={styles.buttonGroup}>
                    <button
                        onClick={() => reset()}
                        className="btn-primary"
                        style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCcw size={16} />
                        Try Again
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="btn-secondary"
                        style={{ justifyContent: 'center' }}
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        </div>
    );
}