// src/app/(app)/participants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, LayoutGrid, List } from 'lucide-react';
import styles from './page.module.scss'; 

// --- TYPES ---
interface ParticipantRecord {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  // Mocked fields for UI fidelity
  mock_ndis_id: string;
  mock_tag: { label: string; type: 'alert' | 'support' | 'general' };
  next_shift: Date | null;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- UI STATES ---
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Recent');

  useEffect(() => {
    const fetchParticipantsFromShifts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all shifts to extract unique participants and their next shifts
        const { data, error } = await supabase
          .from('shifts')
          .select(`
            start_time,
            participants (id, first_name, last_name, avatar_url)
          `)
          .eq('worker_id', user.id)
          .order('start_time', { ascending: true });

        if (error) throw error;

        // Process data to get unique participants
        const uniqueMap = new Map<string, ParticipantRecord>();
        const now = new Date();

        // 1. Definimos la forma exacta de los datos que nos devuelve Supabase
        interface RawShiftData {
          start_time: string;
          participants: {
            id: string;
            first_name: string;
            last_name: string;
            avatar_url?: string;
          } | null;
        }

        // 2. Le decimos a TypeScript que use esa interfaz
        (data as unknown as RawShiftData[])?.forEach((shift) => {
          if (!shift.participants) return;
          
          const pId = shift.participants.id;
          const shiftDate = new Date(shift.start_time);
          
          // Generate deterministic mock data based on name length so it stays consistent
          const nameLen = shift.participants.first_name.length + shift.participants.last_name.length;
          const mockId = `${(nameLen * 123) % 9999}-${(nameLen * 456) % 9999}`;
          
          let mockTag: { label: string; type: 'alert' | 'support' | 'general' } = { label: 'General Care', type: 'general' };
          if (nameLen % 3 === 0) mockTag = { label: 'Medical Alert', type: 'alert' };
          else if (nameLen % 2 === 0) mockTag = { label: 'Mobility Support', type: 'support' };

          if (!uniqueMap.has(pId)) {
            uniqueMap.set(pId, {
              id: pId,
              first_name: shift.participants.first_name,
              last_name: shift.participants.last_name,
              avatar_url: shift.participants.avatar_url,
              mock_ndis_id: mockId,
              mock_tag: mockTag,
              next_shift: shiftDate > now ? shiftDate : null
            });
          } else {
            // Update next shift if we found a closer future shift
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

  // --- HELPERS ---
  const getAvatar = (p: ParticipantRecord) => {
    return p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.first_name} ${p.last_name}`)}&background=F1F5F9&color=64748B`;
  };

  const formatNextShift = (date: Date | null) => {
    if (!date) return 'No upcoming shifts';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (date.toDateString() === today.toDateString()) return `Today, ${timeString}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeString}`;
    
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeString}`;
  };

  const handleViewProfile = (name: string) => {
    alert(`Opening detailed profile for ${name}. This feature is under development.`);
  };

 // --- FILTERING & SORTING ---
  const displayData = participants.filter(p => { // <--- CAMBIA 'let' POR 'const' AQUÍ
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
          <button 
            className={`${styles.toggleBtn} ${activeView === 'grid' ? styles.active : ''}`} 
            onClick={() => setActiveView('grid')}
          >
            <LayoutGrid size={16} /> Grid View
          </button>
          <button 
            className={`${styles.toggleBtn} ${activeView === 'list' ? styles.active : ''}`} 
            onClick={() => setActiveView('list')}
          >
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
              <p className={styles.ndisIdText}>NDIS ID: {p.mock_ndis_id}</p>
              
              <span className={`${styles.tagBadge} ${styles[p.mock_tag.type]}`}>
                {p.mock_tag.label}
              </span>
              
              <p className={styles.nextShiftText}>
                Next Shift: {formatNextShift(p.next_shift)}
              </p>
              
              <button className={styles.outlineBtn} onClick={() => handleViewProfile(p.first_name)}>
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
                  <p className={styles.ndisIdText}>NDIS ID: {p.mock_ndis_id}</p>
                </div>
              </div>

              <span className={`${styles.tagBadge} ${styles[p.mock_tag.type]}`}>
                {p.mock_tag.label}
              </span>

              <span className={styles.listShiftText}>
                Next Shift: {formatNextShift(p.next_shift)}
              </span>

              <div className={styles.listBtnWrapper}>
                <button className={styles.outlineBtn} onClick={() => handleViewProfile(p.first_name)}>
                  View Profile
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}