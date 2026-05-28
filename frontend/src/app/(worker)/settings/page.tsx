// src/app/(app)/settings/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock } from 'lucide-react';
import styles from './page.module.scss';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('My Profile');
  const [userId, setUserId] = useState<string | null>(null);

  // --- FORM STATES ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Field Worker');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const TABS = ['My Profile', 'Security', 'Preferences', 'Legal & Support'];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw error;

        setUserId(user.id);
        if (user.email) setEmail(user.email);

        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, role, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
          if (profile.role) setRole(profile.role);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

const handleSaveChanges = async () => {
    if (!userId) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', userId);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName }
      });

      toast.success('Profile updated successfully!');
      setTimeout(() => {
        window.location.reload(); 
      }, 1200);

    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Error updating your profile.');
    } finally {
      setSaving(false);
    }
  };

  // --- AVATAR UPLOAD HANDLER ---
const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Image is too large. Max size is 5MB.');
        setUploadingAvatar(false);
        return; 
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
      toast.success('Profile picture updated!');
      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error uploading image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // --- AVATAR REMOVE HANDLER ---
  const handleRemoveAvatar = async () => {
    if (!userId) return;
    try {
      setUploadingAvatar(true);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;
      setAvatarUrl(null);
      window.location.reload();
    } catch (error) {
      console.error('Error removing avatar:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  const displayAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${firstName} ${lastName}`)}&background=F1F5F9&color=64748B&size=150`;

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
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>{todayStr}</p>
      </div>

      <div className={styles.settingsLayout}>
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

        <div className={styles.contentArea}>
          {activeTab === 'My Profile' && (
            <div className={styles.card}>
              
              {/* Profile Picture Section */}
              <div>
                <h3 className={styles.sectionTitle}>Profile Picture</h3>
                <div className={styles.profilePictureGroup}>
                  {uploadingAvatar ? (
                    <div className={styles.avatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                      <Loader2 className="animate-spin" size={24} color="var(--text-muted)" />
                    </div>
                  ) : (
                    <Image src={displayAvatar} alt="Profile" width={80} height={80} className={styles.avatar} unoptimized/>
                  )}
                  
                  <div className={styles.picActions}>
                    {/* INPUT INVISIBLE */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      ref={fileInputRef} 
                      onChange={handleAvatarUpload} 
                    />
                    
                    <button 
                      className={styles.outlineBtn} 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Upload New'}
                    </button>
                    
                    {avatarUrl && (
                      <button 
                        className={styles.textBtn} 
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                      >
                        Remove
                      </button>
                    )}
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
                  <div><span className={styles.label}>Role:</span> {role}</div>
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