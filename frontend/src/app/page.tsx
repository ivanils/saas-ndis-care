// src/app/page.tsx
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss'; // Assuming styles stay here for the landing page

export default function WelcomeScreen() {
  const router = useRouter();

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
          <button className={`btn-primary ${styles.fullWidthBtn}`}>
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
    </main>
  );
}