// src/app/admin/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation'; // <-- 1. Import useRouter
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

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}><Loader2 className="animate-spin" color="var(--text-muted)" /></div>
});

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
  const router = useRouter(); // <-- 2. Initialize router
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeShiftsCount: 0,
    pendingIncidentsCount: 0,
    pendingApprovalsCount: 0,
  });
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name: string} | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .single();

        if (!adminProfile) throw new Error("Admin profile not found");
        const currentAgencyId = adminProfile.agency_id;
        setAgencyId(currentAgencyId);

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

  const handleWorkerSelect = (worker: ActiveWorker) => {
    if (worker.clock_in_lat && worker.clock_in_lng) {
      const name = worker.profiles ? `${worker.profiles.first_name} ${worker.profiles.last_name}` : 'Worker';
      setSelectedLocation({ lat: worker.clock_in_lat, lng: worker.clock_in_lng, name });
    } else {
      alert("This worker hasn't provided GPS coordinates yet.");
    }
  };

  // --- 3. METRIC CLICK HANDLER ---
  const handleMetricClick = (type: 'active' | 'incidents' | 'approvals') => {
    if (type === 'active') {
      // Smooth scroll to the Active Workers table
      document.getElementById('active-workers-table')?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'incidents') {
      // Navigate to the Compliance & Incidents page
      router.push('/admin/compliance');
    } else if (type === 'approvals') {
      // Navigate to the Rostering page
      router.push('/admin/rostering');
    }
  };

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
      
      <div className={styles.header}>
        <h1>Control Tower</h1>
        <p>{todayStr}</p>
      </div>

      <div className={styles.metricsGrid}>
        
        {/* Active Shifts Metric - 4. Add onClick */}
        <div className={styles.metricCard} onClick={() => handleMetricClick('active')}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Workers on Shift</span>
            <span className={styles.metricValue}>{metrics.activeShiftsCount}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.blue}`}>
            <Users size={24} />
          </div>
        </div>
        
        {/* Pending Incidents Metric - 4. Add onClick */}
        <div className={styles.metricCard} onClick={() => handleMetricClick('incidents')}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Critical Incidents</span>
            <span className={styles.metricValue}>{metrics.pendingIncidentsCount}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.red}`}>
            <AlertOctagon size={24} />
          </div>
        </div>
        
        {/* Pending Approvals Metric - 4. Add onClick */}
        <div className={styles.metricCard} onClick={() => handleMetricClick('approvals')}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Pending Approvals</span>
            <span className={styles.metricValue}>{metrics.pendingApprovalsCount}</span>
          </div>
          <div className={`${styles.metricIconWrapper} ${styles.yellow}`}>
            <CalendarClock size={24} />
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        
        {/* Left Column: Active Workers Table - 5. Add ID for scrolling */}
        <div className={styles.panel} id="active-workers-table">
          <div className={styles.panelHeader}>
            <h2>Active Field Workers</h2>
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
                        <button 
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleWorkerSelect(shift)}
                          disabled={!shift.clock_in_lat}
                        >
                          Locate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Mini Map */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Live GPS Tracking</h2>
          </div>
          <div style={{ 
            height: '300px', 
            backgroundColor: '#F1F5F9', 
            borderRadius: 'var(--radius-sm)', 
            overflow: 'hidden',
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            {selectedLocation ? (
              <>
                <MapComponent lat={selectedLocation.lat} lng={selectedLocation.lng} />
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '0.8rem', zIndex: 1000, fontWeight: 600 }}>
                  Showing: {selectedLocation.name}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                <MapPin size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.9rem', textAlign: 'center', padding: '0 24px' }}>
                  Click ``Locate´´ on an active worker to view their exact coordinates.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}