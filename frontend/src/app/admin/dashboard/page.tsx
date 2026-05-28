// src/app/admin/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  Users, 
  AlertOctagon, 
  CalendarClock, 
  MapPin, 
  MoreHorizontal
} from 'lucide-react';
import styles from './page.module.scss';

// --- TYPES ---
interface DashboardMetrics {
  activeShiftsCount: number;
  pendingIncidentsCount: number;
  pendingApprovalsCount: number;
}

interface ActiveWorker {
  id: string;
  start_time: string;
  status: string;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
  participants: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeShiftsCount: 0,
    pendingIncidentsCount: 0,
    pendingApprovalsCount: 0,
  });
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get the admin's agency_id to filter data
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .single();

        if (!adminProfile) throw new Error("Admin profile not found");
        setAgencyId(adminProfile.agency_id);

        const currentAgencyId = adminProfile.agency_id;

        // 2. Fetch Metrics (Using 'head' method for counting without downloading data)
        const { count: activeShifts } = await supabase
          .from('shifts')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', currentAgencyId)
          .eq('status', 'in_progress');

        const { count: pendingIncidents } = await supabase
          .from('incident_reports')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', currentAgencyId)
          .eq('status', 'pending');

        const { count: pendingApprovals } = await supabase
          .from('shifts')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', currentAgencyId)
          .eq('status', 'pending_approval');

        setMetrics({
          activeShiftsCount: activeShifts || 0,
          pendingIncidentsCount: pendingIncidents || 0,
          pendingApprovalsCount: pendingApprovals || 0,
        });

        // 3. Fetch Active Workers Table Data
        const { data: shiftsData } = await supabase
          .from('shifts')
          .select(`
            id, 
            start_time, 
            status, 
            clock_in_lat, 
            clock_in_lng,
            profiles (first_name, last_name),
            participants (first_name, last_name)
          `)
          .eq('agency_id', currentAgencyId)
          .eq('status', 'in_progress')
          .order('start_time', { ascending: false });

        if (shiftsData) {
          setActiveWorkers(shiftsData as unknown as ActiveWorker[]);
        }

      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });

  return (
    <div className={styles.dashboardContainer}>
      
      {/* Header */}
      <div className={styles.header}>
        <h1>Control Tower</h1>
        <p>{todayStr}</p>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        
        {/* Active Shifts Metric */}
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Workers on Shift</span>
            <span className={styles.metricValue}>{metrics.activeShiftsCount}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.blue}`}>
            <Users size={24} />
          </div>
        </div>

        {/* Pending Incidents Metric */}
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Critical Incidents</span>
            <span className={styles.metricValue}>{metrics.pendingIncidentsCount}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.red}`}>
            <AlertOctagon size={24} />
          </div>
        </div>

        {/* Pending Approvals Metric */}
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Pending Approvals</span>
            <span className={styles.metricValue}>{metrics.pendingApprovalsCount}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.yellow}`}>
            <CalendarClock size={24} />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className={styles.mainGrid}>
        
        {/* Left Column: Active Workers Table */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Active Field Workers</h2>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              View All
            </button>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Participant</th>
                  <th>Time Started</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No workers are currently clocked in.
                    </td>
                  </tr>
                ) : (
                  activeWorkers.map((shift) => (
                    <tr key={shift.id}>
                      <td style={{ fontWeight: 500 }}>
                        {shift.profiles ? `${shift.profiles.first_name} ${shift.profiles.last_name}` : 'Unknown Staff'}
                      </td>
                      <td>
                        {shift.participants ? `${shift.participants.first_name} ${shift.participants.last_name}` : 'Unknown'}
                      </td>
                      <td>
                        {new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td>
                        {shift.clock_in_lat ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534' }}>
                            <MapPin size={14} /> Verified GPS
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unverified</span>
                        )}
                      </td>
                      <td>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Mini Map Placeholder */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Live GPS Tracking</h2>
          </div>
          <div style={{ 
            height: '300px', 
            backgroundColor: '#F1F5F9', 
            borderRadius: 'var(--radius-sm)', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-color)'
          }}>
            <MapPin size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem', textAlign: 'center', padding: '0 24px' }}>
              Select a worker from the table to view their exact clock-in coordinates on the map.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}