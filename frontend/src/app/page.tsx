'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {supabase} from './lib/supabase';
import styles from './page.module.scss';

export default function WelcomeScreen() {
  const router = useRouter();
  
  // View state: false = Welcome, true = Login Form
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    } else {
      // Successful login, redirect to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <main className={styles.mainContainer}>
      {/* --- DECORATIVE BACKGROUND LAYER --- */}
      <div className={styles.backgroundLayer}>
        {/* Glowing Orbs */}
        <div className={styles.glowBottomLeft} />
        <div className={styles.glowTopRight} />
      </div>
      <div className={`card-sunrise ${styles.loginCard}`}>
        
        {/* Logo Area */}
        <div className={styles.logoContainer}>
          {/* Ensure your file is named 'logo.png' inside the 'public' folder */}
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

        {!showLoginForm ? (
          /* WELCOME VIEW */
          <>
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
                onClick={() => setShowLoginForm(true)}
              >
                Sign In
              </button>
            </div>

            <p className={styles.footerText}>
              No credit card required. 14-day free trial.
            </p>
          </>
        ) : (
          /* LOGIN FORM VIEW */
          <form onSubmit={handleSignIn} className={styles.formContainer}>
            <h2 className={styles.title}>Sign In</h2>
            <p className={styles.subtitle}>Enter your credentials to access your account.</p>

            {errorMessage && (
              <div className={styles.errorBanner}>{errorMessage}</div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@bellvi.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button 
              type="submit" 
              className={`btn-primary ${styles.fullWidthBtn}`}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <button 
              type="button" 
              className={styles.backButton}
              onClick={() => {
                setShowLoginForm(false);
                setErrorMessage(null);
              }}
              disabled={isLoading}
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}