// src/app/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';

export default function WelcomeScreen() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <main className={styles.mainContainer}>
      <div className={styles.backgroundLayer}>
        <div className={styles.glowBottomLeft} />
        <div className={styles.glowTopRight} />
      </div>

      <div className={`card-sunrise ${styles.loginCard}`}>
        <div className={styles.logoContainer}>
          <Image
            src="/bellvi_logo.png"
            alt="Bellvi Logo"
            width={84}
            height={84}
            className={styles.logoImage}
            priority
          />
          <h1 className={styles.logoText}>Bellvi</h1>
        </div>

        <h2 className={styles.title}>Welcome to Bellvi</h2>
        <p className={styles.subtitle}>
          Modern healthcare management simplified.<br/>
          Built for practices that prioritize people.
        </p>

        <div className={styles.buttonGroup}>
          <button
            className={`btn-primary ${styles.fullWidthBtn}`}
            onClick={() => setShowModal(true)}
          >
            Get Started
          </button>
          <button
            className={`btn-secondary ${styles.fullWidthBtn}`}
            onClick={() => router.push('/login')}
          >
            Sign In
          </button>
        </div>

        <p className={styles.footerText}>
          No credit card required. 14-day free trial.
        </p>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>🚀</div>
            <h2 className={styles.modalTitle}>We&apos;re building something great</h2>
            <p className={styles.modalSubtext}>
              Bellvi is currently in private development. We&apos;ll be ready for early access soon — stay tuned.
            </p>
            <button
              className={`btn-primary ${styles.modalBtn}`}
              onClick={() => setShowModal(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}