// src/components/ActiveShiftCard.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { MapPin, PencilLine, FileText, Loader2, X, CheckCircle, AlertTriangle, Phone, Hash, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ActiveShiftCard.module.scss';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}><Loader2 className="animate-spin" /></div>
});

interface ActiveShiftData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  agency_id: string;
  participant_id: string;
  participants: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    medical_alerts: string | null;
    ndis_id: string | null;           
    emergency_contact: string | null;
  } | null;
}
interface PastNote {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function ActiveShiftCard() {
  // State to hold active shift data
  const [activeShift, setActiveShift] = useState<ActiveShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  // State to hold user's current GPS location
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  // State to show a loading spinner on the button while saving to the DB
  const [isClockingOut, setIsClockingOut] = useState(false);
  // Care Note Compliance States
  const [hasCareNote, setHasCareNote] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  // Care Plan State
  const [isCarePlanOpen, setIsCarePlanOpen] = useState(false);
  // Past Notes State
  const [pastNotes, setPastNotes] = useState<PastNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

  useEffect(() => {
    const fetchActiveShift = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // 1. Fetch the shift
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select(`id, start_time, end_time, status, agency_id, participant_id, participants (first_name, last_name, avatar_url, medical_alerts, ndis_id, emergency_contact)`)
          .eq('worker_id', user.id)
          .eq('status', 'in_progress')
          .limit(1)
          .single();

        if (shiftError && shiftError.code !== 'PGRST116') throw shiftError;
        if (shiftData) {
          setActiveShift(shiftData as unknown as ActiveShiftData);

          // 2. Check if a care note already exists for this shift
          const { data: noteData } = await supabase
            .from('care_notes')
            .select('content')
            .eq('shift_id', shiftData.id)
            .eq('worker_id', user.id)
            .single();

          if (noteData) {
            setHasCareNote(true);
            setNoteContent(noteData.content); // Pre-load the existing text
          }
        }
      } catch (error) {
        console.error('Error fetching active shift:', error);
      } finally {
        setLoading(false);
      }
    };
    // Fetch the user's current GPS location
    const fetchLocation = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError('Allow location access to verify GPS');
        },
        { enableHighAccuracy: true }
      );
    };

    fetchActiveShift();
    fetchLocation();
  }, []);

  // Fetch Past Notes when opening the Care Plan
  const handleOpenCarePlan = async () => {
    setIsCarePlanOpen(true);
    if (!activeShift) return;

    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('care_notes')
        // Try to fetch the worker's name. If profiles join fails due to DB setup, we'll handle it gracefully in the UI.
        .select(`id, content, created_at, profiles (first_name, last_name)`)
        .eq('participant_id', activeShift.participant_id)
        .neq('shift_id', activeShift.id) // Exclude the note for the CURRENT shift
        .order('created_at', { ascending: false }); // Newest first

      if (error) throw error;
      setPastNotes(data as unknown as PastNote[]);
    } catch (error) {
      console.error('Error fetching past notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // --- SAVE / UPDATE CARE NOTE LOGIC ---
  const handleSaveCareNote = async () => {
    if (!noteContent.trim() || !activeShift) return;

    setIsSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (hasCareNote) {
        // UPDATE existing note
        const { error } = await supabase
          .from('care_notes')
          .update({ content: noteContent })
          .eq('shift_id', activeShift.id)
          .eq('worker_id', user?.id);

        if (error) throw error;
      } else {
        // INSERT new note
        const { error } = await supabase
          .from('care_notes')
          .insert({
            agency_id: activeShift.agency_id,
            worker_id: user?.id,
            participant_id: activeShift.participant_id,
            shift_id: activeShift.id,
            content: noteContent
          });

        if (error) throw error;
        setHasCareNote(true);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving care note:', error);
      alert('Failed to save care note. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  // --- CLOCK OUT LOGIC ---
  const handleClockOut = async () => {
    if (!activeShift) return;

    // COMPLIANCE CHECK: Prevent clock-out without a care note
    if (!hasCareNote) {
      alert("⚠️ Compliance Error: You must add a Care Note before clocking out of this shift.");
      setIsModalOpen(true);
      return;
    }

    // COMPLIANCE CHECK: Ensure GPS location is available before clocking out
    if (!location) {
      alert("Please wait for GPS verification.");
      return;
    }

    setIsClockingOut(true);

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          clock_out_lat: location.lat,
          clock_out_lng: location.lng
        })
        .eq('id', activeShift.id);

      if (error) throw error;

      // Force a full page reload to refresh both the left timeline and right cards
      window.location.reload();

    } catch (error) {
      console.error('Error during clock-out:', error);
      alert('There was an error clocking out. Please try again.');
      setIsClockingOut(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className={`card-sunrise ${styles.cardContainer}`} style={{ justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading active shift...</p>
      </div>
    );
  }

  if (!activeShift || !activeShift.participants) {
    return (
      <div className={`card-sunrise ${styles.cardContainer}`}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '16px' }}>Active Shift</h3>
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
          You do not have any shift in progress right now.
        </div>
      </div>
    );
  }
  const participant = activeShift.participants;
  const participantName = `${participant.first_name} ${participant.last_name}`;
  const avatarUrl = participant.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=FEF3C7&color=B45309`;

  return (
    <>
      <div className={`card-sunrise ${styles.cardContainer}`}>

        <div className={styles.header}>
          <div className={styles.profileArea}>
            <Image src={avatarUrl} alt={participantName} width={48} height={48} className={styles.avatar} />
            <div className={styles.textData}>
              <h4 className={styles.name}>{participantName}</h4>
              <p className={styles.time}>{formatDate(activeShift.start_time)} - {formatDate(activeShift.end_time)}</p>
            </div>
          </div>
          {activeShift.participants.medical_alerts && (
            <span className="badge alert">Medical Alert</span>
          )}
        </div>

        <div className={styles.mapBox} style={{ padding: 0, overflow: 'hidden' }}>
          {location ? (
            <MapComponent lat={location.lat} lng={location.lng} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <MapPin size={24} />
              <span style={{ fontSize: '0.85rem' }}>{locationError || 'Locating you...'}</span>
            </div>
          )}
        </div>

        {/* Clock Out Action Button */}
        <button
          className={`btn-primary ${styles.clockOutBtn}`}
          onClick={handleClockOut}
          disabled={isClockingOut || !location}
          style={{ opacity: (isClockingOut || !location) ? 0.7 : 1 }}
        >
          {isClockingOut ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Loader2 className="animate-spin" size={18} /> Processing...
            </span>
          ) : (
            'Clock-Out'
          )}
        </button>

        <p className={styles.gpsVerification} style={{ color: location ? 'var(--status-completed-text)' : 'var(--text-muted)' }}>
          <MapPin size={14} />
          {location ? 'GPS Location Verified' : 'GPS Pending...'}
        </p>

        <div className={styles.secondaryActions}>
          <button
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={() => setIsModalOpen(true)}
            style={{
              borderColor: hasCareNote ? 'var(--status-completed-text)' : '',
              color: hasCareNote ? 'var(--status-completed-text)' : ''
            }}
          >
            {hasCareNote ? <><CheckCircle size={16} /> Edit Care Note</> : <><PencilLine size={16} /> Add Care Note</>}
          </button>
          <button 
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={() => handleOpenCarePlan()}>
            <FileText size={16} /> Review Care Plan
          </button>
        </div>
      </div>
      {/*  Care Note Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>

            <div className={styles.modalHeader}>
              <h3>Shift Notes for {participantName}</h3>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <textarea
              className={styles.textarea}
              placeholder="Detail the activities, behavioral observations, and any incidents during this shift..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>

                <button
                  className="btn-primary"
                  onClick={handleSaveCareNote}
                  disabled={!noteContent.trim() || isSavingNote}
                  style={{ width: 'auto', padding: '8px 24px', opacity: (!noteContent.trim() || isSavingNote) ? 0.6 : 1 }}
                >
                  {isSavingNote ? 'Saving...' : (hasCareNote ? 'Update Note' : 'Submit Note')}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* --- CARE PLAN & HISTORY MODAL --- */}
      {isCarePlanOpen && (
        <div className={styles.modalOverlay} style={{ overflowY: 'auto', padding: '20px 0' }}>
          <div className={styles.modalContent} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader} style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-surface)', zIndex: 10, paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0 }}>Care Plan & History</h3>
              <button className={styles.closeBtn} onClick={() => setIsCarePlanOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 0' }}>
              
              {/* Profile Details */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Hash size={20} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2px' }}>NDIS Number</p>
                  <p style={{ fontWeight: 500, color: 'var(--text-dark)' }}>{participant.ndis_id || 'Not provided'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Phone size={20} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Emergency Contact</p>
                  <p style={{ fontWeight: 500, color: 'var(--text-dark)' }}>{participant.emergency_contact || 'None listed'}</p>
                </div>
              </div>

              {participant.medical_alerts && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'var(--status-alert-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <AlertTriangle size={20} color="var(--status-alert-text)" style={{ marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--status-alert-text)', fontWeight: 600, marginBottom: '2px' }}>Active Medical Alert</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--status-alert-text)' }}>{participant.medical_alerts}</p>
                  </div>
                </div>
              )}
            </div>

            {/* --- PAST CARE NOTES SECTION --- */}
            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '20px', marginTop: '8px' }}>
              <h4 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--text-muted)" /> Shift History
              </h4>

              {loadingNotes ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Loader2 className="animate-spin" size={16} /> Fetching records...
                </div>
              ) : pastNotes.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No previous care notes found for this participant.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Slice the array based on showAllNotes state */}
                  {pastNotes.slice(0, showAllNotes ? pastNotes.length : 1).map((note) => {
                    // Try to get author name, fallback to generic if join fails
                    const authorName = note.profiles 
                      ? `${note.profiles.first_name} ${note.profiles.last_name}` 
                      : 'Agency Staff';

                    return (
                      <div key={note.id} style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{authorName}</span>
                          <span>{formatDate(note.created_at)}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </p>
                      </div>
                    );
                  })}
                  
                  {/* Toggle Button */}
                  {pastNotes.length > 1 && (
                    <button 
                      onClick={() => setShowAllNotes(!showAllNotes)}
                      style={{ background: 'none', border: 'none', color: '#F98866', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center', paddingTop: '8px' }}
                    >
                      {showAllNotes ? 'Show Less' : `View ${pastNotes.length - 1} Older Note(s)`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalActions} style={{ marginTop: '24px' }}>
              <button className="btn-primary" onClick={() => setIsCarePlanOpen(false)} style={{ width: '100%' }}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}