// src/app/(superadmin)/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, Building2, Users, Activity } from 'lucide-react';
import styles from './page.module.scss';
import toast from 'react-hot-toast';

// --- TYPES ---
interface PlatformMetrics {
  totalAgencies: number;
  totalUsers: number;
  totalActiveShifts: number;
}

interface AgencyRecord {
  id: string;
  name: string;
  created_at: string;
}

interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ShiftRecord {
  id: string;
  status: string;
  created_at: string;
}

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalAgencies: 0,
    totalUsers: 0,
    totalActiveShifts: 0,
  });
  
  const [recentAgencies, setRecentAgencies] = useState<AgencyRecord[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserRecord[]>([]);
  const [activeShiftsList, setActiveShiftsList] = useState<ShiftRecord[]>([]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'agencies' | 'users' | 'shifts' | null>(null);

  // Fetch all global platform data
  const fetchPlatformData = useCallback(async () => {
    try {
      const { count: agenciesCount, error: agenciesError } = await supabase.from('agencies').select('*', { count: 'exact', head: true });
      const { data: latestAgencies } = await supabase.from('agencies').select('id, name, created_at').order('created_at', { ascending: false }).limit(5);
      if (agenciesError) throw agenciesError;

      const { count: usersCount, error: usersError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: latestUsers } = await supabase.from('profiles').select('id, first_name, last_name, role').order('created_at', { ascending: false }).limit(5);
      if (usersError) throw usersError;

      const { count: activeShiftsCount, error: shiftsError } = await supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
      const { data: latestShifts } = await supabase.from('shifts').select('id, status, created_at').eq('status', 'in_progress').order('created_at', { ascending: false }).limit(5);
      if (shiftsError) throw shiftsError;

      setMetrics({
        totalAgencies: agenciesCount || 0,
        totalUsers: usersCount || 0,
        totalActiveShifts: activeShiftsCount || 0,
      });

      setRecentAgencies((latestAgencies as AgencyRecord[]) || []);
      setRecentUsers((latestUsers as UserRecord[]) || []);
      setActiveShiftsList((latestShifts as ShiftRecord[]) || []);

    } catch (error) {
      console.error('Error fetching platform data:', error);
      toast.error('Failed to load global metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      await fetchPlatformData();
    };
    initData();
  }, [fetchPlatformData]);

  const toggleTab = (tabId: 'agencies' | 'users' | 'shifts') => {
    setActiveTab(prev => prev === tabId ? null : tabId);
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      <div className={styles.header}>
        <h1>Platform Overview</h1>
        <p>Global metrics and system status for Bellvi SaaS.</p>
      </div>

      <div className={styles.metricsGrid}>
        
        {/* TOTAL AGENCIES CARD */}
        <div 
          className={`${styles.metricCard} ${activeTab === 'agencies' ? styles.activeCard : ''}`} 
          onClick={() => toggleTab('agencies')}
        >
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Agencies</span>
            <span className={styles.metricValue}>{metrics.totalAgencies}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.purple}`}>
            <Building2 size={24} />
          </div>
        </div>

        {/* TOTAL USERS CARD */}
        <div 
          className={`${styles.metricCard} ${activeTab === 'users' ? styles.activeCard : ''}`} 
          onClick={() => toggleTab('users')}
        >
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Registered Users</span>
            <span className={styles.metricValue}>{metrics.totalUsers}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.blue}`}>
            <Users size={24} />
          </div>
        </div>

        {/* GLOBAL ACTIVE SHIFTS CARD */}
        <div 
          className={`${styles.metricCard} ${activeTab === 'shifts' ? styles.activeCard : ''}`} 
          onClick={() => toggleTab('shifts')}
        >
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Global Active Shifts</span>
            <span className={styles.metricValue}>{metrics.totalActiveShifts}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.green}`}>
            <Activity size={24} />
          </div>
        </div>

      </div>

      {/* --- DYNAMIC TAB CONTENT SECTION --- */}
      {activeTab && (
        <div className={styles.tabContentSection}>
          <div className={styles.tabContentHeader}>
            <h3>
              {activeTab === 'agencies' && 'Recently Onboarded Agencies'}
              {activeTab === 'users' && 'Newest Registered Users'}
              {activeTab === 'shifts' && 'Currently Active Shifts'}
            </h3>
            <Link
              className={styles.tabActionBtn}
              href={
                activeTab === 'agencies'
                  ? '/superadmin/agencies'
                  : activeTab === 'users'
                  ? '/superadmin/users'
                  : '/superadmin/logs'
              }
            >
              {activeTab === 'agencies' && 'Manage Agencies →'}
              {activeTab === 'users' && 'View All Users →'}
              {activeTab === 'shifts' && 'System Logs →'}
            </Link>
          </div>

          <div className={styles.tabList}>
            
            {activeTab === 'agencies' && recentAgencies.map(agency => (
              <div key={agency.id} className={styles.tabListItem}>
                <span className={styles.itemName}>{agency.name}</span>
                <span className={styles.itemMeta}>{new Date(agency.created_at).toLocaleDateString()}</span>
              </div>
            ))}

            {activeTab === 'users' && recentUsers.map(user => (
              <div key={user.id} className={styles.tabListItem}>
                <span className={styles.itemName}>{user.first_name} {user.last_name}</span>
                <span className={styles.itemMeta}>{user.role.replace('_', ' ')}</span>
              </div>
            ))}

            {activeTab === 'shifts' && (
              activeShiftsList.length === 0 ? (
                <div className={`${styles.tabListItem} ${styles.emptyTabState}`}>
                  <span className={styles.itemMeta}>No shifts currently in progress across all agencies.</span>
                </div>
              ) : (
                activeShiftsList.map(shift => (
                  <div key={shift.id} className={styles.tabListItem}>
                    <span className={styles.itemName}>Shift In Progress</span>
                    <span className={styles.itemMeta} style={{ color: '#166534', fontWeight: 600 }}>Active</span>
                  </div>
                ))
              )
            )}
            
          </div>
        </div>
      )}

      {/* RECENT AGENCIES TABLE PANEL (Main persistent data view) */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Recently Onboarded Agencies</h2>
        </div>
        
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Agency Name</th>
              <th>Status</th>
              <th>Onboarding Date</th>
              <th>System ID</th>
            </tr>
          </thead>
          <tbody>
            {recentAgencies.map((agency) => (
              <tr key={agency.id}>
                <td style={{ fontWeight: 600 }}>{agency.name}</td>
                <td>
                  <span className={styles.statusBadge}>Active</span>
                </td>
                <td>{new Date(agency.created_at).toLocaleDateString()}</td>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {agency.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}