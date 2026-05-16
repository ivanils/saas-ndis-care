// src/app/(app)/my-shifts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Clock, User, MapPin, CalendarDays } from 'lucide-react';
import styles from './page.module.scss'; 

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  participants: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function MyShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    const fetchAllShifts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('shifts')
          .select(`
            id, 
            start_time, 
            end_time, 
            status, 
            participants (first_name, last_name)
          `)
          .eq('worker_id', user.id)
          .order('start_time', { ascending: true });

        if (error) throw error;
        setShifts((data as unknown as Shift[]) || []);
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllShifts();
  }, []);

  // Client-side filtering (fast and efficient for the MVP)
  const upcomingShifts = shifts.filter(s => s.status === 'approved' || s.status === 'in_progress');
  // Reverse the order of past shifts to see the most recent first
  const pastShifts = shifts.filter(s => s.status === 'completed').sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const displayedShifts = activeTab === 'upcoming' ? upcomingShifts : pastShifts;

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const getMonth = (isoString: string) => new Date(isoString).toLocaleDateString('en-US', { month: 'short' });
  const getDay = (isoString: string) => new Date(isoString).getDate();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1>My Shifts</h1>
        <p>Manage your upcoming schedule and review past shifts.</p>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.active : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingShifts.length})
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'past' ? styles.active : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past Shifts ({pastShifts.length})
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className={styles.loaderContainer}>
          <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
        </div>
      ) : displayedShifts.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={48} className={styles.emptyStateIcon} />
          <h3>No {activeTab} shifts found</h3>
          <p>You have no shifts matching this criteria.</p>
        </div>
      ) : (
        <div className={styles.shiftsGrid}>
          {displayedShifts.map((shift) => {
            const participantName = shift.participants 
              ? `${shift.participants.first_name} ${shift.participants.last_name}` 
              : 'Unknown Participant';

            return (
              <div key={shift.id} className={styles.shiftCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.dateBox}>
                    <span className={styles.month}>{getMonth(shift.start_time)}</span>
                    <span className={styles.day}>{getDay(shift.start_time)}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[shift.status]}`}>
                    {shift.status.replace('_', ' ')}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <Clock size={18} className={styles.icon} />
                    <span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <User size={18} className={styles.icon} />
                    <span className={styles.participantName}>{participantName}</span>
                  </div>
                  {/* Placeholder location for MVP */}
                  <div className={styles.infoRow}>
                    <MapPin size={18} className={styles.icon} />
                    <span className={styles.locationText}>Participant residence</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}