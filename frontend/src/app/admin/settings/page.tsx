// src/app/admin/settings/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, User, Building2, CreditCard, Save, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './page.module.scss';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'billing'>('profile');

  // States for Profile
  const [userId, setUserId] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // States for Agency
  const [agencyId, setAgencyId] = useState('');
  const [agencyData, setAgencyData] = useState({
    name: '',
    createdAt: '',
  });

  const fetchSettingsData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in.");
      
      setUserId(user.id);

      // 1. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;

      setProfileData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || user.email || '',
      });

      setAgencyId(profile.agency_id);

      // 2. Fetch Agency Info
      if (profile.agency_id) {
        const { data: agency, error: agencyError } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profile.agency_id)
          .single();
        
        if (agencyError) throw agencyError;

        setAgencyData({
          name: agency.name || '',
          createdAt: new Date(agency.created_at).toLocaleDateString(),
        });
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      await fetchSettingsData();
    };
    initData();
  }, [fetchSettingsData]);

  const handleSaveProfile = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      return toast.error('First and Last name are required.');
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAgency = async () => {
    if (!agencyData.name) {
      return toast.error('Agency name cannot be empty.');
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ name: agencyData.name })
        .eq('id', agencyId);

      if (error) throw error;
      toast.success('Agency details updated successfully!');
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error('Failed to update agency details.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text || '');
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      <div className={styles.header}>
        <h1>Platform Settings</h1>
        <p>Manage your personal profile, agency preferences, and billing.</p>
      </div>

      <div className={styles.settingsLayout}>
        
        {/* SIDE NAVIGATION */}
        <div className={styles.sideMenu}>
          <button 
            className={`${styles.menuItem} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> My Profile
          </button>
          <button 
            className={`${styles.menuItem} ${activeTab === 'agency' ? styles.active : ''}`}
            onClick={() => setActiveTab('agency')}
          >
            <Building2 size={18} /> Agency Details
          </button>
          <button 
            className={`${styles.menuItem} ${activeTab === 'billing' ? styles.active : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <CreditCard size={18} /> Billing & Plan
          </button>
        </div>

        {/* CONTENT PANELS */}
        <div className={styles.contentPanel}>
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <>
              <div className={styles.panelHeader}>
                <h2>Personal Information</h2>
                <p>Update your personal details and contact information.</p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <input 
                    type="text" 
                    value={profileData.firstName} 
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    value={profileData.lastName} 
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Email Address</label>
                  <input type="email" value={profileData.email} disabled title="Email updates require verification" />
                </div>
              </div>

              <div className={styles.panelActions}>
                <button className="btn-primary" onClick={handleSaveProfile} disabled={isSaving} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Profile
                </button>
              </div>
            </>
          )}

          {/* TAB: AGENCY */}
          {activeTab === 'agency' && (
            <>
              <div className={styles.panelHeader}>
                <h2>Tenant Profile</h2>
                <p>Manage your clinics global identity on the platform.</p>
              </div>

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Agency / Clinic Name</label>
                  <input 
                    type="text" 
                    value={agencyData.name} 
                    onChange={(e) => setAgencyData({...agencyData, name: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    System ID (Tenant UUID)
                    <Copy size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => copyToClipboard(agencyId)}/>
                  </label>
                  <input
                    type="text"
                    value={agencyId}
                    readOnly
                    onClick={() => copyToClipboard(agencyId)}
                    title="Click to copy"
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', cursor: 'pointer' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Onboarding Date</label>
                  <input type="text" value={agencyData.createdAt} disabled />
                </div>
              </div>

              <div className={styles.panelActions}>
                <button className="btn-primary" onClick={handleSaveAgency} disabled={isSaving} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Agency Details
                </button>
              </div>
            </>
          )}

          {/* TAB: BILLING */}
          {activeTab === 'billing' && (
            <>
              <div className={styles.panelHeader}>
                <h2>Subscription Status</h2>
                <p>View your current Bellvi SaaS usage plan.</p>
              </div>

              <div className={styles.billingCard}>
                <div className={styles.planInfo}>
                  <h3>Bellvi Professional Plan</h3>
                  <p>Includes unlimited users, advanced rostering, and compliance tracking.</p>
                </div>
                <span className={styles.statusBadge}>Active</span>
              </div>

              <div style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <p>To update your payment methods or change your subscription tier, please contact us on support@bellvi.com</p>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}