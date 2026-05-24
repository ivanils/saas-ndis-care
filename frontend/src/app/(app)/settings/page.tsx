// src/app/(app)/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock } from 'lucide-react';
import styles from './page.module.scss';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('My Profile');

  // --- FORM STATES ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const TABS = ['My Profile', 'Security', 'Preferences', 'Legal & Support'];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw error;

        // Set email directly from auth
        if (user.email) {
          setEmail(user.email);
        }

        // --- NOTE FOR FUTURE ---
        // If you have a 'profiles' table, you would fetch the first/last name here:
        // const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        // if (profile) { setFirstName(profile.first_name); setLastName(profile.last_name); }

        // Mock data for MVP visual fidelity
        setFirstName('Jane');
        setLastName('Doe');

      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSaveChanges = async () => {
    setSaving(true);
    // Simulate API call delay for saving profile data
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    alert('Profile updated successfully!');
  };

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${firstName} ${lastName}`)}&background=F1F5F9&color=64748B&size=150`;

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loaderContainer}>
          <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      {/* Page Header */}
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>{todayStr}</p>
      </div>

      <div className={styles.settingsLayout}>
        
        {/* Sidebar Navigation */}
        <div className={styles.sidebar}>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className={styles.contentArea}>
          
          {activeTab === 'My Profile' && (
            <div className={styles.card}>
              
              {/* Profile Picture Section */}
              <div>
                <h3 className={styles.sectionTitle}>Profile Picture</h3>
                <div className={styles.profilePictureGroup}>
                  <Image src={avatarUrl} alt="Profile" width={80} height={80} className={styles.avatar} />
                  <div className={styles.picActions}>
                    <button className={styles.outlineBtn}>Upload New</button>
                    <button className={styles.textBtn}>Remove</button>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div>
                <h3 className={styles.sectionTitle}>Personal Information</h3>
                
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>First Name</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Last Name</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <div className={styles.inputWrapper}>
                    <input 
                      type="email" 
                      className={styles.inputDisabled} 
                      value={email} 
                      disabled 
                      readOnly
                    />
                    <Lock size={16} className={styles.lockIcon} />
                  </div>
                </div>
              </div>

              {/* Work Details Section */}
              <div>
                <h3 className={styles.sectionTitle}>Work Details</h3>
                <div className={styles.workDetails}>
                  <div><span className={styles.label}>Role:</span> Field Worker</div>
                  <div><span className={styles.label}>Agency:</span> Sunrise Care Partners</div>
                </div>
              </div>

              {/* Save Actions */}
              <div className={styles.actionsRow}>
                <button 
                  className={styles.primaryBtn} 
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </div>
          )}

          {/* Placeholders for other tabs */}
          {activeTab !== 'My Profile' && (
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>{activeTab}</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                These settings are currently managed by your agency administrator.
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}