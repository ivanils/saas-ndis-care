// src/app/(superadmin)/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalAgencies: 0,
    totalUsers: 0,
    totalActiveShifts: 0,
  });
  const [recentAgencies, setRecentAgencies] = useState<AgencyRecord[]>([]);

  // Fetch all global platform data without agency filters
  const fetchPlatformData = useCallback(async () => {
    try {
      // 1. Fetch total agencies count
      const { count: agenciesCount, error: agenciesError } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true });
      
      if (agenciesError) throw agenciesError;

      // 2. Fetch total profiles count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // 3. Fetch total active shifts across ALL agencies
      const { count: activeShiftsCount, error: shiftsError } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      if (shiftsError) throw shiftsError;

      setMetrics({
        totalAgencies: agenciesCount || 0,
        totalUsers: usersCount || 0,
        totalActiveShifts: activeShiftsCount || 0,
      });

      // 4. Fetch the most recent agencies onboarded
      const { data: recentAgenciesData, error: recentAgenciesError } = await supabase
        .from('agencies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentAgenciesError) throw recentAgenciesError;
      
      setRecentAgencies(recentAgenciesData as AgencyRecord[]);

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
        
        {/* Total Agencies Metric */}
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Agencies</span>
            <span className={styles.metricValue}>{metrics.totalAgencies}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.purple}`}>
            <Building2 size={24} />
          </div>
        </div>

        {/* Total Users Metric */}
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Registered Users</span>
            <span className={styles.metricValue}>{metrics.totalUsers}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.blue}`}>
            <Users size={24} />
          </div>
        </div>

        {/* Global Active Shifts Metric */}
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Global Active Shifts</span>
            <span className={styles.metricValue}>{metrics.totalActiveShifts}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.green}`}>
            <Activity size={24} />
          </div>
        </div>
      </div>

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