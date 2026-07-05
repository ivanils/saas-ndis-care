// src/app/admin/rostering/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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
  worker_id: string; 
  participant_id: string;
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayHour === 0 ? 12 : displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();

export default function RosteringPage() {
  const [loading, setLoading] = useState(true);
  
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

  // --- HELPER: GET TOKEN ---
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchRosteringData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No auth token");

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [shiftsRes, workersRes, participantsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/shifts/`, { headers }),
        fetch(`${BACKEND_URL}/profiles/`, { headers }), 
        fetch(`${BACKEND_URL}/participants/`, { headers })
      ]);

      if (!shiftsRes.ok || !workersRes.ok || !participantsRes.ok) {
        throw new Error('Failed to fetch data from backend');
      }

      const shiftsData = await shiftsRes.json();
      const workersData = await workersRes.json();
      const participantsData = await participantsRes.json();

      const sortedShifts = shiftsData.sort((a: { start_time: string }, b: { start_time: string }) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );

      setShifts(sortedShifts);
      setWorkers(workersData.filter((w: { role: string }) => w.role === 'worker') || []);
      setParticipants(participantsData || []);

    } catch (error) {
      console.error('Error fetching rostering data:', error);
      toast.error('Failed to load scheduling data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchRosteringData();
    };
    init();
  }, [fetchRosteringData]);

  const handleCreateShift = async () => {
    if (!selectedWorker || !selectedParticipant || !shiftDate || !startTime || !endTime) {
      return toast.error('Please fill in all required fields.');
    }

    const start = new Date(`${shiftDate}T${startTime}`);
    const end = new Date(`${shiftDate}T${endTime}`);
    if (end <= start) return toast.error('End time must be after start time.');

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      const startDateTime = start.toISOString();
      const endDateTime = end.toISOString();

      const response = await fetch(`${BACKEND_URL}/shifts/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: selectedWorker,
          participant_id: selectedParticipant,
          start_time: startDateTime,
          end_time: endDateTime,
          status: 'assigned' 
        })
      });

      if (!response.ok) throw new Error('Failed to create shift in backend');
      
      toast.success('Shift successfully scheduled!');
      setSelectedWorker(''); setSelectedParticipant(''); setShiftDate(''); setStartTime(''); setEndTime('');
      setIsModalOpen(false);
      fetchRosteringData(); 

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
      const token = await getAuthToken();
      const response = await fetch(`${BACKEND_URL}/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'assigned' }) 
      });
      if (!response.ok) throw new Error('Failed to update shift');

      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'assigned' } : s));
      toast.success('Shift approved and scheduled!');
    } catch (error) {
      toast.error('Failed to approve shift.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDisputeShift = async (shiftId: string) => {
    setDisputingId(shiftId);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${BACKEND_URL}/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disputed' })
      });
      if (!response.ok) throw new Error('Failed to update shift');

      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'disputed' } : s));
      toast.success('Shift flagged as disputed.');
    } catch (error) {
      toast.error('Failed to flag shift as disputed.');
    } finally {
      setDisputingId(null);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm("Are you sure you want to cancel this shift?")) return;
    setDeletingId(shiftId);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${BACKEND_URL}/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (!response.ok) throw new Error('Failed to cancel shift');

      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'cancelled' } : s));
      toast.success('Shift cancelled.');
    } catch (error) {
      toast.error('Failed to cancel shift.');
    } finally {
      setDeletingId(null);
    }
  };

  // --- HELPERS VISUALES ---
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  const getWorkerName = (id: string) => {
    const w = workers.find(w => w.id === id);
    return w ? `${w.first_name} ${w.last_name}` : 'Unknown Worker';
  };
  const getParticipantName = (id: string) => {
    const p = participants.find(p => p.id === id);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown Participant';
  };

  const filteredShifts = shifts.filter(shift => {
    if (filter === 'all') return true;
    if (filter === 'scheduled' && shift.status === 'assigned') return true; 
    return shift.status === filter;
  });

  if (loading) {
    return (
      <div className={styles.loaderContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
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
            const end = formatDateTime(shift.end_time || shift.start_time);

            return (
              <div key={shift.id} className={styles.shiftCard}>
                
                <div className={styles.shiftHeader}>
                  <span className={`${styles.statusBadge} ${styles[shift.status] || ''}`}>
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
                      title="Cancel Shift"
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
                    Worker: <strong>{getWorkerName(shift.worker_id)}</strong>
                  </span>
                </div>
                <div className={styles.shiftDetailRow}>
                  <BriefcaseMedical size={18} />
                  <span>
                    Participant: <strong>{getParticipantName(shift.participant_id)}</strong>
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