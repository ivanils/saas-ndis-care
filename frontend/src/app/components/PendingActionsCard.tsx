// src/components/PendingActionsCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, FileText, AlertOctagon, Loader2 } from 'lucide-react';
import styles from './PendingActionsCard.module.scss';

interface ExpiringCert {
    id: string;
    type: string;
    expiration_date: string;
}

interface PendingIncident {
    id: string;
    created_at: string;
    participants?: {
        first_name: string;
        last_name: string;
    } | null;
}

// NUEVO: Interfaz para las Políticas
interface PendingPolicy {
    id: string;
    title: string;
}

export default function PendingActionsCard() {
    const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([]);
    const [pendingIncidents, setPendingIncidents] = useState<PendingIncident[]>([]);
    const [pendingPolicies, setPendingPolicies] = useState<PendingPolicy[]>([]); // NUEVO ESTADO
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPendingActions = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch Expiring Certifications
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                const targetDateString = thirtyDaysFromNow.toISOString().split('T')[0];

                const { data: certData } = await supabase
                    .from('worker_certifications')
                    .select('id, type, expiration_date')
                    .eq('worker_id', user.id)
                    .lte('expiration_date', targetDateString)
                    .gte('expiration_date', new Date().toISOString().split('T')[0])
                    .order('expiration_date', { ascending: true });

                setExpiringCerts(certData || []);

                // 2. Fetch Pending Incident Reports
                const { data: incidentData } = await supabase
                    .from('incident_reports')
                    .select('id, created_at, status, worker_id, participants(first_name, last_name)')
                    .eq('worker_id', user.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                setPendingIncidents((incidentData as unknown as PendingIncident[]) || []);

                // 3. NUEVO: Fetch Pending Policies
                const { data: policyData } = await supabase
                    .from('worker_policies')
                    .select('id, title')
                    .eq('worker_id', user.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                setPendingPolicies(policyData || []);

            } catch (error) {
                console.error('Error fetching pending actions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPendingActions();
    }, []);

    const getDaysLeft = (expirationDate: string) => {
        const today = new Date();
        const expDate = new Date(expirationDate);
        const diffTime = Math.abs(expDate.getTime() - today.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    // --- NEW HANDLER for Acknowledging Policies ---
    const handleAcknowledgePolicy = async (policyId: string) => {
        try {
            // 1. update status to 'acknowledged' in the database
            const { error } = await supabase
                .from('worker_policies')
                .update({ status: 'acknowledged' })
                .eq('id', policyId);

            if (error) throw error;

            // 2. delete the policy from the local state to remove it from the UI
            setPendingPolicies((prevPolicies) =>
                prevPolicies.filter((policy) => policy.id !== policyId)
            );

        } catch (error) {
            console.error('Error acknowledging policy:', error);
            alert('Failed to acknowledge policy. Please try again.');
        }
    };
    if (loading) {
        return (
            <div className={`card-white ${styles.cardContainer}`}>
                <h3 className={styles.cardTitle}>Pending Actions</h3>
                <div className={styles.loaderBox}>
                    <Loader2 className="animate-spin" />
                </div>
            </div>
        );
    }

    // Now we check all three arrays to see if they are completely empty
    const hasNoActions = expiringCerts.length === 0 && pendingIncidents.length === 0 && pendingPolicies.length === 0;

    return (
        <div className={`card-white ${styles.cardContainer}`}>
            <h3 className={styles.cardTitle}>Pending Actions</h3>

            {hasNoActions ? (
                <div className={styles.emptyState}>
                    <p>You are all caught up! No pending actions.</p>
                </div>
            ) : (
                <div className={styles.actionsList}>

                    {/* 1. Incident reports (Highest Priority - Red) */}
                    {pendingIncidents.map((incident) => {
                        const participantName = incident.participants
                            ? `${incident.participants.first_name} ${incident.participants.last_name}`
                            : 'Unknown Participant';

                        return (
                            <div key={incident.id} className={styles.actionItem}>
                                <div className={styles.actionInfo}>
                                    <AlertOctagon
                                        size={20}
                                        className={`${styles.actionIcon} ${styles.urgent}`}
                                        style={{ color: 'red' }}
                                    />
                                    <div>
                                        <p className={styles.actionTextPrimary}>
                                            File Incident Report
                                        </p>
                                        <p className={styles.actionTextSecondary}>
                                            For {participantName} ({formatDate(incident.created_at)})
                                        </p>
                                    </div>
                                </div>
                                <button className={styles.actionBtn}>
                                    Draft
                                </button>
                            </div>
                        );
                    })}

                    {/* 2. Expiring Certifications (Orange / Yellow) */}
                    {expiringCerts.map((cert) => {
                        const daysLeft = getDaysLeft(cert.expiration_date);
                        const isUrgent = daysLeft <= 14;

                        return (
                            <div key={cert.id} className={styles.actionItem}>
                                <div className={styles.actionInfo}>
                                    <AlertTriangle
                                        size={20}
                                        className={`${styles.actionIcon} ${isUrgent ? styles.urgent : styles.warning}`}
                                        style={{ color: isUrgent ? 'red' : '#EAB308' }}
                                    />
                                    <div>
                                        <p className={styles.actionTextPrimary}>
                                            Renew {cert.type}
                                        </p>
                                        <p className={styles.actionTextSecondary}>
                                            Expires in {daysLeft} days
                                        </p>
                                    </div>
                                </div>
                                <button className={styles.actionBtn}>
                                    Upload
                                </button>
                            </div>
                        );
                    })}

                    {/* 3. Dynamic Policies (Gray) */}
                    {pendingPolicies.map((policy) => (
                        <div key={policy.id} className={styles.actionItem}>
                            <div className={styles.actionInfo}>
                                <FileText size={20} className={`${styles.actionIcon} ${styles.normal}`} style={{ color: 'blue' }} />
                                <div>
                                    <p className={styles.actionTextPrimary}>
                                        {policy.title}
                                    </p>
                                </div>
                            </div>
                            <button
                                className={styles.actionBtn}
                                onClick={() => handleAcknowledgePolicy(policy.id)} 
                            >
                                Sign
                            </button>
                        </div>
                    ))}

                </div>
            )}
        </div>
    );
}