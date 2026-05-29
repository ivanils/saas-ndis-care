// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './page.module.scss';
export default function LoginScreen() {
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Fetch the user's role from the 'profiles' table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 3. Role-Based Routing
      const userRole = profileData.role;

      if (userRole === 'super_admin') {
        router.push('/superadmin/dashboard');
      } else if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard'); // Default worker route
      }

    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred during sign in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}