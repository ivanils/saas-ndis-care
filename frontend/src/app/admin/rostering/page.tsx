// src/app/admin/rostering/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Loader2, Plus, Calendar, Clock, User, X, BriefcaseMedical, Trash2, CheckCircle, AlertTriangle
} from 'lucide-react';
import styles from './page.module.scss';

// --- TYPES ---
interface ShiftRecord {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  profiles: { first_name: string; last_name: string } | null;
  participants: { first_name: string; last_name: string } | null;
}

interface WorkerProfile {
  id: string;
  first_name: string;
  last_name: string;
}

interface ParticipantRecord {
  id: string;
  first_name: string;
  last_name: string;
}

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();


export default function RosteringPage() {
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null); 
  
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    const fetchRosteringData = async () => {
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

        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select(`
            id, start_time, end_time, status,
            profiles (first_name, last_name),
            participants (first_name, last_name)
          `)
          .eq('agency_id', currentAgencyId)
          .order('start_time', { ascending: false });

        if (shiftsError) throw shiftsError;
        setShifts(shiftsData as unknown as ShiftRecord[]);

        const { data: workersData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('agency_id', currentAgencyId)
          .eq('role', 'worker');

        setWorkers(workersData || []);

        const { data: participantsData } = await supabase
          .from('participants')
          .select('id, first_name, last_name')
          .eq('agency_id', currentAgencyId);

        setParticipants(participantsData || []);

      } catch (error) {
        console.error('Error fetching rostering data:', error);
        toast.error('Failed to load scheduling data.');
      } finally {
        setLoading(false);
      }
    };

    fetchRosteringData();
  }, []);

  const handleCreateShift = async () => {
    if (!agencyId || !selectedWorker || !selectedParticipant || !shiftDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${shiftDate}T${startTime}`).toISOString();
      const endDateTime = new Date(`${shiftDate}T${endTime}`).toISOString();

      const { data: newShift, error } = await supabase
        .from('shifts')
        .insert({
          agency_id: agencyId,
          worker_id: selectedWorker,
          participant_id: selectedParticipant,
          start_time: startDateTime,
          end_time: endDateTime,
          status: 'scheduled'
        })
        .select(`
          id, start_time, end_time, status,
          profiles (first_name, last_name),
          participants (first_name, last_name)
        `)
        .single();

      if (error) throw error;

      if (newShift) {
        setShifts((prev) => {
          const updated = [newShift as unknown as ShiftRecord, ...prev];
          return updated.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        });
      }

      toast.success('Shift successfully scheduled!');
      setSelectedWorker('');
      setSelectedParticipant('');
      setShiftDate('');
      setStartTime('');
      setEndTime('');
      setIsModalOpen(false);

    } catch (error) {
      console.error('Error creating shift:', error);
      toast.error('Failed to create shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveShift = async (shiftId: string) => {
    setApprovingId(shiftId);
    try {
      const { error } = await supabase.from('shifts').update({ status: 'scheduled' }).eq('id', shiftId);
      if (error) throw error;
      setShifts((prev) => prev.map(shift => shift.id === shiftId ? { ...shift, status: 'scheduled' } : shift));
      toast.success('Shift approved and scheduled!');
    } catch (error) {
      console.error('Error approving shift:', error);
      toast.error('Failed to approve shift.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDisputeShift = async (shiftId: string) => {
    setDisputingId(shiftId);
    try {
      const { error } = await supabase.from('shifts').update({ status: 'disputed' }).eq('id', shiftId);
      if (error) throw error;
      setShifts((prev) => prev.map(shift => shift.id === shiftId ? { ...shift, status: 'disputed' } : shift));
      toast.success('Shift flagged as disputed.');
    } catch (error) {
      console.error('Error disputing shift:', error);
      toast.error('Failed to flag shift as disputed.');
    } finally {
      setDisputingId(null);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm("Are you sure you want to cancel and delete this shift?")) return;
    setDeletingId(shiftId);
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
      if (error) throw error;
      setShifts((prev) => prev.filter(shift => shift.id !== shiftId));
      toast.success('Shift cancelled successfully.');
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to cancel shift.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  const filteredShifts = shifts.filter(shift => {
    if (filter === 'all') return true;
    return shift.status === filter;
  });

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
        <div>
          <h1>Rostering & Schedules</h1>
          <p>Manage upcoming shifts and assign support workers.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Plus size={18} /> Assign New Shift
        </button>
      </div>

      <div className={styles.filterBar}>
        <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>
          All Shifts
        </button>
        <button className={`${styles.filterBtn} ${filter === 'pending_approval' ? styles.active : ''}`} onClick={() => setFilter('pending_approval')}>
          Pending Approval
        </button>
        <button className={`${styles.filterBtn} ${filter === 'scheduled' ? styles.active : ''}`} onClick={() => setFilter('scheduled')}>
          Scheduled
        </button>
        <button className={`${styles.filterBtn} ${filter === 'in_progress' ? styles.active : ''}`} onClick={() => setFilter('in_progress')}>
          In Progress
        </button>
        <button className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`} onClick={() => setFilter('completed')}>
          Completed
        </button>
        <button className={`${styles.filterBtn} ${filter === 'disputed' ? styles.active : ''}`} onClick={() => setFilter('disputed')}>
          Disputed
        </button>
      </div>

      <div className={styles.shiftsGrid}>
        {filteredShifts.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>No shifts found</h3>
            <p>Try changing your filters or create a new shift.</p>
          </div>
        ) : (
          filteredShifts.map((shift) => {
            const start = formatDateTime(shift.start_time);
            const end = formatDateTime(shift.end_time);

            return (
              <div key={shift.id} className={styles.shiftCard}>
                
                <div className={styles.shiftHeader}>
                  <span className={`${styles.statusBadge} ${styles[shift.status]}`}>
                    {shift.status.replace('_', ' ')}
                  </span>
                  
                  <div className={styles.shiftActions}>
                    {shift.status === 'pending_approval' && (
                      <button 
                        onClick={() => handleApproveShift(shift.id)}
                        disabled={approvingId === shift.id}
                        className={styles.approveBtn}
                        title="Approve Shift"
                      >
                        {approvingId === shift.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={18} />}
                      </button>
                    )}

                    {(shift.status !== 'disputed' && shift.status !== 'cancelled') && (
                      <button 
                        onClick={() => handleDisputeShift(shift.id)}
                        disabled={disputingId === shift.id}
                        className={styles.disputeBtn}
                        title="Flag as Disputed"
                      >
                        {disputingId === shift.id ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={18} />}
                      </button>
                    )}

                    <button 
                      onClick={() => handleDeleteShift(shift.id)}
                      disabled={deletingId === shift.id}
                      className={styles.deleteBtn}
                      title="Cancel/Delete Shift"
                    >
                      {deletingId === shift.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className={styles.shiftDetailRow}>
                  <Calendar size={18} />
                  <span><strong>{start.date}</strong></span>
                </div>
                <div className={styles.shiftDetailRow}>
                  <Clock size={18} />
                  <span>{start.time} — {end.time}</span>
                </div>
                <div className={styles.shiftDetailRow} style={{ marginTop: '20px' }}>
                  <User size={18} />
                  <span>
                    Worker: <strong>{shift.profiles ? `${shift.profiles.first_name} ${shift.profiles.last_name}` : 'Unassigned'}</strong>
                  </span>
                </div>
                <div className={styles.shiftDetailRow}>
                  <BriefcaseMedical size={18} />
                  <span>
                    Participant: <strong>{shift.participants ? `${shift.participants.first_name} ${shift.participants.last_name}` : 'Unknown'}</strong>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <h2>Schedule New Shift</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Select Participant (Client)</label>
                <select value={selectedParticipant} onChange={(e) => setSelectedParticipant(e.target.value)}>
                  <option value="" disabled>Choose a participant...</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Assign Support Worker</label>
                <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
                  <option value="" disabled>Choose a worker...</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={shiftDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setShiftDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Start Time</label>
                  <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                    <option value="" disabled>-- : --</option>
                    {timeOptions.map(t => (
                      <option key={`start-${t.value}`} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>End Time</label>
                  <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                    <option value="" disabled>-- : --</option>
                    {timeOptions.map(t => (
                      <option key={`end-${t.value}`} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateShift} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Confirm Assignment'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}