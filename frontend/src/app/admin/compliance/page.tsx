// src/app/admin/compliance/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    Loader2, AlertOctagon, FileText, User, Calendar, CheckCircle, Clock
} from 'lucide-react';
import styles from './page.module.scss';

// --- TYPES ---
interface ParticipantData {
    first_name: string;
    last_name: string;
}

interface WorkerData {
    id: string;
    first_name: string;
    last_name: string;
}

interface IncidentReport {
    id: string;
    worker_id: string;
    status: string;
    created_at: string;
    initial_description: string;
    participants: ParticipantData | null;
    workerName?: string;
}

interface CareNote {
    id: string;
    worker_id: string;
    created_at: string;
    content: string;
    participants: ParticipantData | null;
    workerName?: string; 
}

export default function CompliancePage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'incidents' | 'notes'>('incidents');

    const [incidents, setIncidents] = useState<IncidentReport[]>([]);
    const [notes, setNotes] = useState<CareNote[]>([]);

    const fetchComplianceData = useCallback(async () => {
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

            const { data: workersData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .eq('agency_id', currentAgencyId);

            const workers = (workersData || []) as WorkerData[];
            const getWorkerName = (workerId: string) => {
                const w = workers.find(w => w.id === workerId);
                return w ? `${w.first_name} ${w.last_name}` : 'Unknown Worker';
            };

      const { data: incidentsData } = await supabase
        .from('incident_reports')
        .select('id, worker_id, status, created_at, initial_description, participants(first_name, last_name)')
        .eq('agency_id', currentAgencyId)
        .order('created_at', { ascending: false });

      const mappedIncidents = ((incidentsData as unknown as IncidentReport[]) || []).map(inc => ({
        ...inc,
        workerName: getWorkerName(inc.worker_id)
      }));

      setIncidents(mappedIncidents);

      const { data: notesData } = await supabase
        .from('care_notes')
        .select('id, worker_id, created_at, content, participants(first_name, last_name)')
        .eq('agency_id', currentAgencyId)
        .order('created_at', { ascending: false });

      const mappedNotes = ((notesData as unknown as CareNote[]) || []).map(note => ({
        ...note,
        workerName: getWorkerName(note.worker_id)
      }));

      setNotes(mappedNotes);

        } catch (error) {
            console.error('Error fetching compliance data:', error);
            toast.error('Failed to load compliance data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadCompliance = async () => {
            await fetchComplianceData();
        };

        loadCompliance();
    }, [fetchComplianceData]);

    const handleResolveIncident = async (incidentId: string) => {
        try {
            const { error } = await supabase
                .from('incident_reports')
                .update({ status: 'resolved' })
                .eq('id', incidentId);

            if (error) throw error;

            setIncidents(prev => prev.map(inc =>
                inc.id === incidentId ? { ...inc, status: 'resolved' } : inc
            ));

            toast.success('Incident marked as resolved.');
        } catch (error) {
            console.error('Error resolving incident:', error);
            toast.error('Failed to update incident status.');
        }
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className={styles.loaderContainer}>
                <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
            </div>
        );
    }

    const pendingIncidents = incidents.filter(i => i.status === 'pending');
    const resolvedIncidents = incidents.filter(i => i.status !== 'pending');

    return (
        <div className={styles.pageContainer}>

            <div className={styles.header}>
                <h1>Compliance & Audit Trail</h1>
                <p>Review incident reports and daily care notes submitted by field workers.</p>
            </div>

            <div className={styles.tabsWrapper}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'incidents' ? styles.active : ''}`}
                    onClick={() => setActiveTab('incidents')}
                >
                    Incident Reports
                    {pendingIncidents.length > 0 && (
                        <span style={{ backgroundColor: '#EF4444', color: 'white', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px', fontSize: '0.75rem' }}>
                            {pendingIncidents.length}
                        </span>
                    )}
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'notes' ? styles.active : ''}`}
                    onClick={() => setActiveTab('notes')}
                >
                    Shift Care Notes
                </button>
            </div>

            <div className={styles.gridContainer}>

                {activeTab === 'incidents' && (
                    <>
                        {incidents.length === 0 ? (
                            <div className={styles.emptyState}>
                                <AlertOctagon size={48} style={{ opacity: 0.2 }} />
                                <h3>No incident reports found</h3>
                                <p>There are no incidents logged in the system.</p>
                            </div>
                        ) : (
                            [...pendingIncidents, ...resolvedIncidents].map((incident) => {
                                const isPending = incident.status === 'pending';
                                const participantName = incident.participants ? `${incident.participants.first_name} ${incident.participants.last_name}` : 'Unknown Participant';

                                return (
                                    <div key={incident.id} className={`${styles.reportCard} ${isPending ? styles.urgent : ''}`}>
                                        <div className={styles.cardHeader}>
                                            <div className={styles.metaInfo}>
                                                <div><User size={16} /> <strong>Participant:</strong> {participantName}</div>
                                                <div><User size={16} color="#38BDF8" /> <strong>Reported By:</strong> {incident.workerName}</div>
                                                <div><Clock size={16} /> {formatDateTime(incident.created_at)}</div>
                                            </div>
                                            <span className={`${styles.statusBadge} ${isPending ? styles.pending : styles.resolved}`}>
                                                {incident.status}
                                            </span>
                                        </div>

                                        <div className={styles.contentBody}>
                                            {incident.initial_description || 'No description provided.'}
                                        </div>

                                        {isPending && (
                                            <div className={styles.actionRow}>
                                                <button
                                                    className="btn-primary"
                                                    style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                                                    onClick={() => handleResolveIncident(incident.id)}
                                                >
                                                    <CheckCircle size={16} /> Mark as Resolved
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </>
                )}

                {activeTab === 'notes' && (
                    <>
                        {notes.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FileText size={48} style={{ opacity: 0.2 }} />
                                <h3>No care notes submitted yet</h3>
                                <p>Completed shift notes will appear here.</p>
                            </div>
                        ) : (
                            notes.map((note) => {
                                const participantName = note.participants ? `${note.participants.first_name} ${note.participants.last_name}` : 'Unknown Participant';

                                return (
                                    <div key={note.id} className={styles.reportCard}>
                                        <div className={styles.cardHeader}>
                                            <div className={styles.metaInfo}>
                                                <div><User size={16} /> <strong>Participant:</strong> {participantName}</div>
                                                <div><User size={16} color="#38BDF8" /> <strong>Written By:</strong> {note.workerName}</div>
                                                <div><Calendar size={16} /> {formatDateTime(note.created_at)}</div>
                                            </div>
                                            <span className={`${styles.statusBadge} ${styles.note}`}>Routine Note</span>
                                        </div>

                                        <div className={styles.contentBody}>
                                            {note.content}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}

            </div>
        </div>
    );
}