// src/app/(app)/participants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, LayoutGrid, List, X, Phone, HeartPulse, AlertTriangle, FileText } from 'lucide-react';
import styles from './page.module.scss'; 
import toast from 'react-hot-toast';

// --- TYPES ---
interface ParticipantBase {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  ndis_id: string;
  medical_condition_tag: 'alert' | 'support' | 'general';
  next_shift: Date | null;
}

interface ParticipantDetails {
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_type: string;
  allergies: string;
  mobility_notes: string;
  latest_note?: {
    content: string;
    created_at: string;
  } | null;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantBase[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- UI STATES ---
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Recent');
  
  // --- DRAWER STATES ---
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantBase | null>(null);
  const [drawerDetails, setDrawerDetails] = useState<ParticipantDetails | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // Fetch baseline participant list through shifts
  useEffect(() => {
    const fetchParticipantsFromShifts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        interface RawShiftData {
          start_time: string;
          participants: {
            id: string;
            first_name: string;
            last_name: string;
            avatar_url?: string;
            ndis_id: string;
            medical_condition_tag: string;
          } | null;
        }

        const { data, error } = await supabase
          .from('shifts')
          .select(`
            start_time,
            participants (id, first_name, last_name, avatar_url, ndis_id, medical_condition_tag)
          `)
          .eq('worker_id', user.id)
          .order('start_time', { ascending: true });

        if (error) throw error;

        const uniqueMap = new Map<string, ParticipantBase>();
        const now = new Date();

        (data as unknown as RawShiftData[])?.forEach((shift) => {
          if (!shift.participants) return;
          
          const pId = shift.participants.id;
          const shiftDate = new Date(shift.start_time);
          
          if (!uniqueMap.has(pId)) {
            uniqueMap.set(pId, {
              id: pId,
              first_name: shift.participants.first_name,
              last_name: shift.participants.last_name,
              avatar_url: shift.participants.avatar_url,
              ndis_id: shift.participants.ndis_id || 'N/A',
              medical_condition_tag: (shift.participants.medical_condition_tag as 'alert' | 'support' | 'general') || 'general',
              next_shift: shiftDate > now ? shiftDate : null
            });
          } else {
            const existing = uniqueMap.get(pId)!;
            if (shiftDate > now && (!existing.next_shift || shiftDate < existing.next_shift)) {
              existing.next_shift = shiftDate;
            }
          }
        });

        setParticipants(Array.from(uniqueMap.values()));
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantsFromShifts();
  }, []);

  // Fetch detailed clinical data when a profile is opened
  const handleViewProfile = async (participant: ParticipantBase) => {
    setSelectedParticipant(participant);
    setLoadingDrawer(true);
    setDrawerDetails(null);

    try {
      // 1. Fetch deep profiles properties
      const { data: profileData, error: profileError } = await supabase
        .from('participants')
        .select('phone, emergency_contact_name, emergency_contact_phone, blood_type, allergies, mobility_notes')
        .eq('id', participant.id)
        .single();

      if (profileError) throw profileError;

      // 2. Fetch the absolute latest care note entry for this specific participant
      const { data: noteData, error: noteError } = await supabase
        .from('care_notes')
        .select('content, created_at')
        .eq('shift_id', participant.id) // Fallback or matching index relationship if tied directly
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDrawerDetails({
        phone: profileData.phone || 'Not Specified',
        emergency_contact_name: profileData.emergency_contact_name || 'None Set',
        emergency_contact_phone: profileData.emergency_contact_phone || '',
        blood_type: profileData.blood_type || 'Unknown',
        allergies: profileData.allergies || 'None disclosed',
        mobility_notes: profileData.mobility_notes || 'Standard mobility parameters.',
        latest_note: noteData
      });

    } catch (err) {
      console.error('Error fetching deep profile data:', err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const getAvatar = (p: ParticipantBase) => {
    return p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.first_name} ${p.last_name}`)}&background=F1F5F9&color=64748B`;
  };

  const getTagLabel = (tag: 'alert' | 'support' | 'general') => {
    if (tag === 'alert') return 'Medical Alert';
    if (tag === 'support') return 'Mobility Support';
    return 'General Care';
  };

  const formatNextShift = (date: Date | null) => {
    if (!date) return 'No upcoming shifts';
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (date.toDateString() === today.toDateString()) return `Today, ${timeString}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeString}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeString}`;
  };

  // --- FILTERING & SORTING ---
  const displayData = participants.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (sortBy === 'Name') {
    displayData.sort((a, b) => a.first_name.localeCompare(b.first_name));
  } else if (sortBy === 'Next Shift') {
    displayData.sort((a, b) => {
      if (!a.next_shift) return 1;
      if (!b.next_shift) return -1;
      return a.next_shift.getTime() - b.next_shift.getTime();
    });
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.pageContainer}>
      
      {/* Page Header */}
      <div className={styles.header}>
        <h1>Participants</h1>
        <p>{todayStr}</p>
      </div>

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.viewToggle}>
          <button className={`${styles.toggleBtn} ${activeView === 'grid' ? styles.active : ''}`} onClick={() => setActiveView('grid')}>
            <LayoutGrid size={16} /> Grid View
          </button>
          <button className={`${styles.toggleBtn} ${activeView === 'list' ? styles.active : ''}`} onClick={() => setActiveView('list')}>
            <List size={16} /> List View
          </button>
        </div>

        <div className={styles.filtersGroup}>
          <select className={styles.selectInput} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="Recent">Sort by: Recent</option>
            <option value="Name">Sort by: Name (A-Z)</option>
            <option value="Next Shift">Sort by: Next Shift</option>
          </select>

          <div className={styles.searchContainer}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search participant..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content Renderer */}
      {loading ? (
        <div className={styles.loaderContainer}>
          <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
        </div>
      ) : displayData.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No participants found matching your criteria.</p>
        </div>
      ) : activeView === 'grid' ? (
        
        /* GRID VIEW */
        <div className={styles.gridView}>
          {displayData.map(p => (
            <div key={p.id} className={styles.gridCard}>
              <Image src={getAvatar(p)} alt={p.first_name} width={80} height={80} className={styles.avatarLarge} />
              
              <h3 className={styles.nameText}>{p.first_name} {p.last_name}</h3>
              <p className={styles.ndisIdText}>NDIS ID: {p.ndis_id}</p>
              
              <span className={`${styles.tagBadge} ${styles[p.medical_condition_tag]}`}>
                {getTagLabel(p.medical_condition_tag)}
              </span>
              
              <p className={styles.nextShiftText}>
                Next Shift: {formatNextShift(p.next_shift)}
              </p>
              
              <button className={styles.outlineBtn} onClick={() => handleViewProfile(p)}>
                View Profile
              </button>
            </div>
          ))}
        </div>

      ) : (

        /* LIST VIEW */
        <div className={styles.listView}>
          {displayData.map(p => (
            <div key={p.id} className={styles.listRow}>
              
              <div className={styles.listProfileGroup}>
                <Image src={getAvatar(p)} alt={p.first_name} width={50} height={50} className={styles.avatarSmall} />
                <div className={styles.listInfoGroup}>
                  <h3 className={styles.nameText}>{p.first_name} {p.last_name}</h3>
                  <p className={styles.ndisIdText}>NDIS ID: {p.ndis_id}</p>
                </div>
              </div>

              <span className={`${styles.tagBadge} ${styles[p.medical_condition_tag]}`}>
                {getTagLabel(p.medical_condition_tag)}
              </span>

              <span className={styles.listShiftText}>
                Next Shift: {formatNextShift(p.next_shift)}
              </span>

              <div className={styles.listBtnWrapper}>
                <button className={styles.outlineBtn} onClick={() => handleViewProfile(p)}>
                  View Profile
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* --- SLIDE-OVER PROFILE DRAWER --- */}
      {selectedParticipant && (
        <div className={styles.drawerOverlay} onClick={() => { setSelectedParticipant(null); setDrawerDetails(null); }}>
          <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
            
            <div className={styles.drawerHeader}>
              <button className={styles.closeBtn} onClick={() => { setSelectedParticipant(null); setDrawerDetails(null); }}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              
              {/* Profile Hero Section */}
              <div className={styles.profileHero}>
                <Image src={getAvatar(selectedParticipant)} alt="Avatar" width={100} height={100} className={styles.heroAvatar} />
                <h2>{selectedParticipant.first_name} {selectedParticipant.last_name}</h2>
                <p>NDIS ID: {selectedParticipant.ndis_id}</p>
                <span className={`${styles.tagBadge} ${styles[selectedParticipant.medical_condition_tag]}`}>
                  {getTagLabel(selectedParticipant.medical_condition_tag)}
                </span>
              </div>

              {loadingDrawer ? (
                /* LOADER INSIDE DRAWER WHILE FETCHING CLINICAL DATA */
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Loader2 className="animate-spin" size={28} color="var(--color-primary)" />
                </div>
              ) : drawerDetails ? (
                /* DYNAMIC DATA DISPLAY */
                <>
                  {/* Section 1: Emergency & Contact */}
                  <div className={styles.profileSection}>
                    <h3><Phone size={18} /> Contact Information</h3>
                    <div className={styles.infoCard}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Primary Phone</span>
                        <span className={styles.infoValue}>{drawerDetails.phone}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Emergency Contact</span>
                        <span className={styles.infoValue}>{drawerDetails.emergency_contact_name}</span>
                      </div>
                      {drawerDetails.emergency_contact_phone && (
                        <button 
                          className={styles.callBtn} 
                          onClick={() => toast.success(`Simulating phone call to: ${drawerDetails.emergency_contact_phone}`)}
                        >
                          <Phone size={16} /> Call Emergency Contact ({drawerDetails.emergency_contact_phone})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Clinical Data */}
                  <div className={styles.profileSection}>
                    <h3><HeartPulse size={18} /> Medical Overview</h3>
                    <div className={styles.infoCard}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Blood Type</span>
                        <span className={styles.infoValue}>{drawerDetails.blood_type}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Allergies</span>
                        <span className={styles.infoValue} style={{ color: '#DC2626' }}>{drawerDetails.allergies}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Mobility Notes</span>
                        <span className={styles.infoValue}>{drawerDetails.mobility_notes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Recent Care Notes */}
                  <div className={styles.profileSection}>
                    <h3><FileText size={18} /> Latest Care Note</h3>
                    {drawerDetails.latest_note ? (
                      <div className={styles.noteCard}>
                        {drawerDetails.latest_note.content}
                        <span className={styles.noteAuthor}>
                          Submitted on {new Date(drawerDetails.latest_note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    ) : (
                      <div className={styles.noteCard} style={{ backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', color: 'var(--text-muted)' }}>
                        No care notes documented for this participant yet.
                      </div>
                    )}
                  </div>
                </>
              ) : null}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}