// src/app/(app)/my-shifts/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, X, Clock, MapPin, FileText, User, CalendarX2, PlayCircle, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import styles from './page.module.scss';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const SHIFTS_SELECT = `
  id,
  participant_id,
  start_time,
  end_time,
  status,
  clock_in_lat,
  clock_in_lng,
  participants (first_name, last_name, avatar_url, address)
`;

async function fetchWorkerShifts(userId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select(SHIFTS_SELECT)
    .eq('worker_id', userId)
    .order('start_time', { ascending: false });
  if (error) throw error;
  return (data as unknown as Shift[]) || [];
}

function getCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('not_supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

interface PreviousCareNote {
  content: string;
  created_at: string;
  worker: { first_name: string; last_name: string } | null;
}

interface Shift {
  id: string;
  participant_id: string;
  start_time: string;
  end_time: string;
  status: string;
  clock_in_lat?: number | null;
  clock_in_lng?: number | null;
  participants: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    address?: string | null;
  } | null;
}

export default function MyShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');

  // --- FILTER STATES ---
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('This Month');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- CALENDAR NAV STATE ---
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // --- MODAL STATES ---
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [modalType, setModalType] = useState<'details' | 'careNote' | null>(null);
  const [careNoteContent, setCareNoteContent] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const [previousCareNote, setPreviousCareNote] = useState<PreviousCareNote | null>(null);
  const [previousNoteLoaded, setPreviousNoteLoaded] = useState(false);
  const [loadingPreviousNote, setLoadingPreviousNote] = useState(false);
  // --- ALERT MODAL STATE ---
  const [featureAlert, setFeatureAlert] = useState<string | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [shiftActionLoading, setShiftActionLoading] = useState<string | null>(null);

  // --- DRAWER STATE ---
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Used only by action handlers (Start Shift / Clock-Out) to silently
  // refresh the shift list after a mutation. Does not manage loading state
  // because the per-button shiftActionLoading already covers that UX.
  const fetchAllShifts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setShifts([]); return; }
      setShifts(await fetchWorkerShifts(user.id));
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  }, []);

  // Initial mount fetch — inline async IIFE so the linter can verify that
  // all setState calls are after await (not synchronous in the effect body).
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setShifts([]); return; }
        setShifts(await fetchWorkerShifts(user.id));
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- COMPREHENSIVE FILTERING LOGIC ---
  const getStatusMapping = (status: string) => {
    switch (status) {
      case 'assigned':         return { label: 'Assigned',          className: styles.assigned };
      case 'approved':         return { label: 'Assigned',          className: styles.assigned };
      case 'in_progress':      return { label: 'In Progress',       className: styles.in_progress };
      case 'pending_approval': return { label: 'Pending Approval',  className: styles.pending_approval };
      case 'completed':        return { label: 'Completed',         className: styles.completed };
      case 'disputed':         return { label: 'Disputed',          className: styles.disputed };
      case 'cancelled':        return { label: 'Cancelled',         className: styles.cancelled };
      default:                 return { label: status,              className: styles.assigned };
    }
  };

  const isShiftPast = (shift: Shift): boolean => {
    const cutoff = shift.end_time
      ? new Date(shift.end_time)
      : new Date(new Date(shift.start_time).getTime() + 2 * 60 * 60 * 1000);
    return new Date() > cutoff;
  };

  const canStartShift = (shift: Shift, isToday: boolean): boolean =>
    isToday && !isShiftPast(shift) && (shift.status === 'assigned' || shift.status === 'approved');

  const filteredShifts = shifts.filter((shift) => {
    // 1. Search filter matching name
    const pName = shift.participants ? `${shift.participants.first_name} ${shift.participants.last_name}`.toLowerCase() : '';
    const matchesSearch = pName.includes(searchQuery.toLowerCase());

    // 2. Status filter mapping
    const mappedStatusLabel = getStatusMapping(shift.status).label;
    const matchesStatus = statusFilter === 'All' || mappedStatusLabel === statusFilter;

    // 3. Date filter range limitation (applied strictly to the active List View rows)
    const shiftDate = new Date(shift.start_time);
    const todayRef = new Date();
    let matchesDate = true;

    if (dateFilter === 'This Month') {
      matchesDate = shiftDate.getMonth() === todayRef.getMonth() && shiftDate.getFullYear() === todayRef.getFullYear();
    } else if (dateFilter === 'Last Month') {
      const prevMonth = todayRef.getMonth() === 0 ? 11 : todayRef.getMonth() - 1;
      const prevYear = todayRef.getMonth() === 0 ? todayRef.getFullYear() - 1 : todayRef.getFullYear();
      matchesDate = shiftDate.getMonth() === prevMonth && shiftDate.getFullYear() === prevYear;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // --- CALENDAR PAGINATION HANDLERS ---
  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- MODAL & DRAWER ACTION HANDLERS ---
  const fetchPreviousCareNote = async (participantId: string, currentShiftId: string) => {
    setLoadingPreviousNote(true);
    setPreviousCareNote(null);
    setPreviousNoteLoaded(false);
    try {
      const { data, error } = await supabase
        .from('care_notes')
        .select('content, created_at, worker:profiles!worker_id(first_name, last_name)')
        .eq('participant_id', participantId)
        .or(`shift_id.is.null,shift_id.neq.${currentShiftId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setPreviousCareNote(data as PreviousCareNote | null);
    } catch (err) {
      console.error('Error fetching previous care note:', err);
    } finally {
      setLoadingPreviousNote(false);
      setPreviousNoteLoaded(true);
    }
  };

  const handleViewDetails = (shift: Shift) => {
    setSelectedShift(shift);
    setModalType('details');
    fetchPreviousCareNote(shift.participant_id, shift.id);
  };

  const handleViewCareNote = async (shift: Shift) => {
    setSelectedShift(shift);
    setModalType('careNote');
    setLoadingNote(true);
    setCareNoteContent(null);

    try {
      const { data, error } = await supabase.from('care_notes').select('content').eq('shift_id', shift.id).maybeSingle();
      if (error) throw error;
      setCareNoteContent(data ? data.content : "No care note found for this shift.");
    } catch (err) {
      console.error('Error fetching care note:', err);
      setCareNoteContent("Error loading care note.");
    } finally {
      setLoadingNote(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedShift(null);
  };

  const closeDrawer = () => setSelectedDate(null);
  const handleGenericAction = (actionName: string) => {
    setFeatureAlert(actionName);
  };

  const handleStartShift = async (shift: Shift) => {
    setShiftActionLoading(shift.id);
    try {
      let coords: { latitude: number; longitude: number };
      try {
        coords = await getCoordinates();
      } catch {
        setGeoBlocked(true);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${BACKEND_URL}/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', clock_in_lat: coords.latitude, clock_in_lng: coords.longitude }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.detail || 'Failed to start shift.'); return; }
      toast.success('Shift started! Stay safe.');
      await fetchAllShifts();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setShiftActionLoading(null);
    }
  };

  const handleClockOut = async (shift: Shift) => {
    setShiftActionLoading(shift.id);
    try {
      let coords: { latitude: number; longitude: number };
      try {
        coords = await getCoordinates();
      } catch {
        setGeoBlocked(true);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${BACKEND_URL}/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', clock_out_lat: coords.latitude, clock_out_lng: coords.longitude }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.detail || 'Failed to clock out.'); return; }
      toast.success('Clocked out successfully. Great work!');
      await fetchAllShifts();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setShiftActionLoading(null);
    }
  };

  // --- TIME FORMATTING UTILITIES ---
  const getRelativeDateString = (isoString: string) => {
    const date = new Date(isoString);
    const todayRef = new Date();
    const yesterday = new Date(todayRef); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(todayRef); tomorrow.setDate(tomorrow.getDate() + 1);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateFormatted = date.toLocaleDateString('en-US', options);

    if (date.toDateString() === todayRef.toDateString()) return `Today, ${dateFormatted}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${dateFormatted}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${dateFormatted}`;

    return `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${dateFormatted}`;
  };

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getParticipantAvatar = (shift: Shift) => {
    const participantName = shift.participants ? `${shift.participants.first_name} ${shift.participants.last_name}` : 'Unknown Participant';
    return shift.participants?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=F1F5F9&color=64748B`;
  };

  // --- DYNAMIC CALENDAR GENERATION BASED ON ACTIVE NAV DATE ---
  const todayRef = new Date();
  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const totalCellsNeeded = startingEmptyCells + daysInMonth > 35 ? 42 : 35;
  const calendarCells = Array.from({ length: totalCellsNeeded }).map((_, i) => {
    const dayNumber = i - startingEmptyCells + 1;
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    return {
      dayNumber: isCurrentMonth ? dayNumber : null,
      isToday: isCurrentMonth && dayNumber === todayRef.getDate() && calendarMonth === todayRef.getMonth() && calendarYear === todayRef.getFullYear(),
      dateObj: isCurrentMonth ? new Date(calendarYear, calendarMonth, dayNumber) : null
    };
  });

  // Calculate matching items specifically for the drawer selection
  const drawerShifts = selectedDate
    ? filteredShifts.filter(s => new Date(s.start_time).toDateString() === selectedDate.toDateString())
    : [];

  return (
    <div className={styles.pageContainer}>

      {/* Page Header */}
      <div className={styles.header}>
        <h1>My Shifts</h1>
        <p>{todayRef.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* Global Functional Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.viewToggle}>
          <button className={`${styles.toggleBtn} ${activeView === 'list' ? styles.active : ''}`} onClick={() => setActiveView('list')}>
            List View
          </button>
          <button className={`${styles.toggleBtn} ${activeView === 'calendar' ? styles.active : ''}`} onClick={() => setActiveView('calendar')}>
            Calendar View
          </button>
        </div>

        <div className={styles.filtersGroup}>
          <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">Status: All</option>
            <option value="Completed">Completed</option>
            <option value="Pending Approval">Pending</option>
            <option value="Assigned">Assigned</option>
          </select>

          <select
            className={styles.selectInput}
            value={dateFilter}
            onChange={(e) => {
              const newValue = e.target.value;
              setDateFilter(newValue);

              const targetDate = new Date();
              if (newValue === 'Last Month') {
                targetDate.setMonth(targetDate.getMonth() - 1);
              }
              setCurrentCalendarDate(targetDate);
            }}
          >
            <option value="This Month">Date: This Month</option>
            <option value="Last Month">Date: Last Month</option>
            <option value="All">Date: All</option>
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

      {/* Primary Context Renderer */}
      {loading ? (
        <div className={styles.loaderContainer}>
          <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
        </div>
      ) : activeView === 'list' ? (

        /* LIST VIEW IMPLEMENTATION */
        <div className={styles.listView}>
          {filteredShifts.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={48} className={styles.emptyStateIcon} />
              <h3>No matching shifts found</h3>
              <p>Try adjusting your search criteria or filter options.</p>
            </div>
          ) : (
            filteredShifts.map((shift) => {
              const mappedStatus = getStatusMapping(shift.status);
              const participantName = shift.participants ? `${shift.participants.first_name} ${shift.participants.last_name}` : 'Unknown Participant';

              return (
                <div key={shift.id} className={styles.listRow} onClick={() => handleViewDetails(shift)} style={{ cursor: 'pointer' }}>
                  <div className={styles.dateCol}>
                    <span className={styles.relativeDay}>{getRelativeDateString(shift.start_time)}</span>
                    <span className={styles.timeRange}>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                  </div>
                  <div className={styles.profileCol}>
                    <Image src={getParticipantAvatar(shift)} alt={participantName} width={40} height={40} className={styles.avatar} />
                    <span className={styles.participantName}>{participantName}</span>
                  </div>
                  <div className={styles.statusCol}>
                    <span className={`${styles.badge} ${mappedStatus.className}`}>{mappedStatus.label}</span>
                  </div>
                  <div className={styles.actionCol}>
                    {(shift.status === 'assigned' || shift.status === 'approved') && (
                      <button className={styles.outlineBtn} onClick={(e) => { e.stopPropagation(); handleViewDetails(shift); }}>View Details</button>
                    )}
                    {shift.status === 'in_progress' && (
                      <span className={styles.actionText}>Currently Active</span>
                    )}
                    {shift.status === 'completed' && (
                      <button className={styles.outlineBtn} onClick={(e) => { e.stopPropagation(); handleViewCareNote(shift); }}>View Care Note</button>
                    )}
                    {shift.status === 'pending_approval' && (
                      <span className={styles.actionText}>Awaiting Admin Review</span>
                    )}
                    {shift.status === 'disputed' && (
                      <span className={`${styles.actionText} ${styles.disputedText}`}>Disputed</span>
                    )}
                    {shift.status === 'cancelled' && (
                      <span className={styles.actionText}>Cancelled</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      ) : (
        /* CALENDAR VIEW IMPLEMENTATION */
        <div className={styles.calendarContainer}>

          {/* Calendar Dynamic Navigation Controls */}
          <div className={styles.calendarNav}>
            <span className={styles.monthTitle}>
              {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <div className={styles.navBtnGroup}>
              <button className={styles.navBtn} onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
              <button className={styles.navBtn} onClick={handleNextMonth}><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className={styles.calendarHeader}>
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className={styles.calendarGrid}>
            {calendarCells.map((cell, index) => {
              // Filters active items specifically matching this unique day grid box
              const dayShifts = cell.dateObj
                ? filteredShifts.filter(s => new Date(s.start_time).toDateString() === cell.dateObj?.toDateString())
                : [];

              return (
                <div
                  key={index}
                  className={`${styles.calendarCell} ${!cell.dayNumber ? styles.emptyCell : styles.interactiveCell}`}
                  onClick={() => cell.dateObj && setSelectedDate(cell.dateObj)}
                >
                  {cell.dayNumber && (
                    <div className={`${styles.dateNumber} ${cell.isToday ? styles.isToday : ''}`}>
                      {cell.dayNumber}
                    </div>
                  )}
                  {dayShifts.map(shift => {
                    const mappedStatus = getStatusMapping(shift.status);
                    const initial = shift.participants?.first_name.charAt(0) || '';
                    const lastNameInitial = shift.participants?.last_name.charAt(0) || '';

                    return (
                      <div key={shift.id} className={`${styles.shiftBlock} ${mappedStatus.className}`}>
                        {formatTime(shift.start_time)} - {initial}. {lastNameInitial}.
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- SLIDE-OVER DRAWER FOR CALENDAR CLICKS --- */}
      {selectedDate && (
        <div className={styles.drawerOverlay} onClick={closeDrawer}>
          <div className={styles.drawerContainer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2>{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</h2>
                <p>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <button className={styles.closeBtn} onClick={closeDrawer}><X size={24} /></button>
            </div>

            <div className={styles.drawerBody}>
              {drawerShifts.length > 0 ? (
                <div className={styles.timeline}>
                  {drawerShifts.map((shift) => {
                    const mappedStatus = getStatusMapping(shift.status);
                    const participantName = shift.participants ? `${shift.participants.first_name} ${shift.participants.last_name}` : 'Unknown';
                    const isToday = selectedDate.toDateString() === todayRef.toDateString();

                    return (
                      <div key={shift.id} className={styles.timelineItem}>
                        <div className={styles.timelineDot}><Clock size={16} /></div>
                        <div className={styles.timelineContent}>
                          <span className={`${styles.drawerBadge} ${mappedStatus.className}`}>
                            {mappedStatus.label}
                          </span>
                          <h4>{participantName}</h4>
                          <div className={styles.timeRow}><Clock size={14} /> {formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                          <div className={styles.timeRow}><MapPin size={14} /> Participant Residence</div>

                          <div className={styles.drawerActions}>
                            <button className={styles.actionBtnSmall} onClick={() => { closeDrawer(); handleViewDetails(shift); }}>
                              <User size={14} /> View Plan
                            </button>
                            {(shift.status === 'assigned' || shift.status === 'approved') && (
                              canStartShift(shift, isToday)
                                ? <button
                                    className={`${styles.actionBtnSmall} ${styles.primary}`}
                                    onClick={() => handleStartShift(shift)}
                                    disabled={shiftActionLoading === shift.id}
                                  >
                                    <PlayCircle size={14} />
                                    {shiftActionLoading === shift.id ? 'Starting…' : 'Start Shift'}
                                  </button>
                                : isToday
                                  ? <span className={styles.actionText}>Shift time has passed</span>
                                  : null
                            )}
                            {shift.status === 'in_progress' && (
                              <>
                                <span className={`${styles.actionText} ${styles.activeText}`}>
                                  <span className={styles.activeDot} /> Currently Active
                                </span>
                                <button
                                  className={`${styles.actionBtnSmall} ${styles.primary}`}
                                  onClick={() => handleClockOut(shift)}
                                  disabled={shiftActionLoading === shift.id}
                                >
                                  {shiftActionLoading === shift.id ? 'Clocking out…' : 'Clock-Out'}
                                </button>
                              </>
                            )}
                            {shift.status === 'completed' && (
                              <button className={styles.actionBtnSmall} onClick={() => { closeDrawer(); handleViewCareNote(shift); }}>
                                <FileText size={14} /> Read Note
                              </button>
                            )}
                            {shift.status === 'pending_approval' && (
                              <span className={styles.actionText}>Awaiting Admin Review</span>
                            )}
                            {shift.status === 'disputed' && (
                              <span className={`${styles.actionText} ${styles.disputedText}`}>Contact your admin</span>
                            )}
                            {shift.status === 'cancelled' && (
                              <span className={styles.actionText}>This shift was cancelled</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.drawerEmpty}>
                  <CalendarX2 size={64} strokeWidth={1} />
                  <h3>No shifts scheduled</h3>
                  <p>You have a clear day. Let the agency know if you are taking the day off.</p>
                  <button className={styles.outlineBtn} onClick={() => handleGenericAction('Mark as Unavailable')}>
                    Mark as Unavailable
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING SIDE MODALS RENDER --- */}
      {modalType && selectedShift && (
        <div className={styles.clientModalOverlay} onClick={closeModal}>
          <div className={styles.clientModal} onClick={e => e.stopPropagation()}>

            <button className={styles.clientModalClose} onClick={closeModal}>
              <X size={24} />
            </button>

            {/* HEADER */}
            <div className={styles.clientHeader}>
              <Image
                src={getParticipantAvatar(selectedShift)}
                alt="Participant"
                width={80}
                height={80}
                className={styles.clientAvatar}
              />
              <h2 className={styles.clientName}>
                {selectedShift.participants ? `${selectedShift.participants.first_name} ${selectedShift.participants.last_name}` : 'Unknown'}
              </h2>
              <span className={styles.clientTag}>Medical Alert</span>
            </div>

            {/* BODY */}
            <div className={styles.clientBody}>

              {modalType === 'careNote' ? (
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>Full Care Note</h3>
                  {loadingNote ? (
                    <Loader2 className="animate-spin" size={20} style={{ display: 'block', margin: '24px auto' }} />
                  ) : (
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-dark)' }}>{careNoteContent}</p>
                  )}
                </div>
              ) : <>

              {/* SECTION 1: Shift Info */}
              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionTitle}>Section 1: Shift Info</h3>
                <div className={styles.shiftInfoCard}>
                  <div className={styles.shiftInfoTop}>
                    <div className={styles.timeRow}>
                      <span className={styles.timeText}>
                        {getRelativeDateString(selectedShift.start_time).split(',')[0]}, {formatTime(selectedShift.start_time)} - {formatTime(selectedShift.end_time)}
                      </span>
                      <span className={styles.statusBadgeProgress}>
                        {selectedShift.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                      </span>
                    </div>
                    <div className={styles.dateSubtext}>Date & Time</div>
                    <div className={styles.locationRow}>
                      <MapPin size={16} color="var(--text-muted)" />
                      <span>{selectedShift.participants?.address || 'No address on file'}</span>
                    </div>
                  </div>
                  <div className={styles.shiftInfoMap}>
                    {selectedShift.participants?.address ? (
                      <iframe
                        title="Participant Location"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedShift.participants.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    ) : (
                      <div className={styles.mapUnavailable}>
                        <MapPin size={24} color="var(--text-muted)" />
                        <span>Map unavailable — no address on file</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Quick Actions */}
              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionTitle}>Section 2: Quick Actions</h3>
                <div>
                  {selectedShift.status === 'in_progress' && (
                    <button
                      className={styles.btnPrimaryFull}
                      onClick={() => { handleClockOut(selectedShift); closeModal(); }}
                      disabled={shiftActionLoading === selectedShift.id}
                    >
                      {shiftActionLoading === selectedShift.id ? 'Clocking out…' : 'Clock-Out'}
                    </button>
                  )}
                  {(selectedShift.status === 'assigned' || selectedShift.status === 'approved') && !isShiftPast(selectedShift) && (
                    <button
                      className={styles.btnPrimaryFull}
                      onClick={() => { handleStartShift(selectedShift); closeModal(); }}
                      disabled={shiftActionLoading === selectedShift.id}
                    >
                      {shiftActionLoading === selectedShift.id ? 'Starting…' : 'Start Shift'}
                    </button>
                  )}
                  <div className={styles.btnGroupHalf}>
                    <button
                      className={styles.btnOutlineHalf}
                      onClick={() => handleGenericAction('Get Directions')}
                    >
                      Get Directions
                    </button>
                    <button
                      className={styles.btnOutlineHalf}
                      onClick={() => handleGenericAction('Emergency Contact')}
                    >
                      Emergency Contact
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Clinical Context */}
              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionTitle}>Section 3: Clinical Context</h3>
                <div className={styles.contextSubtitle}>Previous Care Note Summary</div>
                <div className={styles.contextBox}>
                  {!previousNoteLoaded || loadingPreviousNote ? (
                    <Loader2 className="animate-spin" size={16} style={{ display: 'block', margin: '8px auto' }} />
                  ) : previousCareNote ? (
                    <>
                      {previousCareNote.content.length > 150
                        ? previousCareNote.content.slice(0, 150) + '…'
                        : previousCareNote.content}
                      {previousCareNote.content.length > 150 && (
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0 4px', fontSize: 'inherit' }}
                          onClick={() => { setCareNoteContent(previousCareNote.content); setModalType('careNote'); }}
                        >
                          Ver más
                        </button>
                      )}
                      <span className={styles.contextAuthor}>
                        Written by {previousCareNote.worker
                          ? `${previousCareNote.worker.first_name} ${previousCareNote.worker.last_name}`
                          : 'Unknown'} on {new Date(previousCareNote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No previous care notes for this participant.
                    </span>
                  )}
                </div>
              </div>

              </>}
            </div>

          </div>
        </div>
      )}
{/* --- LOCATION REQUIRED MODAL --- */}
      {geoBlocked && (
        <div className={styles.alertModalOverlay} onClick={() => setGeoBlocked(false)}>
          <div className={styles.alertModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.alertModalHeader}>
              <h3>Location Required</h3>
            </div>
            <div className={styles.alertModalBody}>
              <p>
                Your location is required to start or clock out of a shift. This is used for attendance verification in compliance with NDIS standards.
              </p>
              <p>
                Please allow location access in your browser settings and try again.
              </p>
            </div>
            <div className={styles.alertModalActions}>
              <button className={styles.btnPrimaryFull} onClick={() => setGeoBlocked(false)}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

{/* --- FEATURE IN DEVELOPMENT MODAL --- */}
      {featureAlert && (
        <div className={styles.alertModalOverlay} onClick={() => setFeatureAlert(null)}>
          <div className={styles.alertModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.alertModalHeader}>
              <h3>Coming Soon</h3>
            </div>
            <div className={styles.alertModalBody}>
              <p>
                The <strong>{featureAlert}</strong> feature is currently under development and will be available in a future update.
              </p>
            </div>
            <div className={styles.alertModalActions}>
              <button className={styles.btnPrimaryFull} onClick={() => setFeatureAlert(null)}>
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

    </div> 
  );
}