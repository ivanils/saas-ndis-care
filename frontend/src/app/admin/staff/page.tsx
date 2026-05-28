// src/app/admin/staff/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    Loader2, Plus, ShieldCheck, AlertTriangle, XCircle, Search, X, FileCheck, Mail
} from 'lucide-react';
import styles from './page.module.scss';

// --- TYPES ---
interface WorkerCert {
    id: string;
    worker_id: string;
    type: string;
    expiration_date: string;
}

interface WorkerProfile {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    role: string;
}

interface StaffMember extends WorkerProfile {
    complianceStatus: 'compliant' | 'warning' | 'non_compliant';
    expiringSoonCount: number;
    expiredCount: number;
    certs: WorkerCert[];
}

export default function StaffPage() {
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [agencyId, setAgencyId] = useState<string | null>(null);

    // States for Invite Modal
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteFirstName, setInviteFirstName] = useState('');
    const [inviteLastName, setInviteLastName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // States for Profile Drawer
    const [selectedWorker, setSelectedWorker] = useState<StaffMember | null>(null);
    const [isAddingCert, setIsAddingCert] = useState(false);
    const [newCertType, setNewCertType] = useState('First Aid & CPR');
    const [newCertDate, setNewCertDate] = useState('');

    // Main Data Fetch
    const fetchStaffData = useCallback(async () => {
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

            const { data: workersData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_url, role')
                .eq('agency_id', currentAgencyId)
                .eq('role', 'worker')
                .order('first_name', { ascending: true });

            const workers = (workersData || []) as WorkerProfile[];
            const workerIds = workers.map(w => w.id);

            const { data: certsData } = await supabase
                .from('worker_certifications')
                .select('id, worker_id, type, expiration_date')
                .in('worker_id', workerIds.length > 0 ? workerIds : ['uuid-placeholder']);

            const certs = (certsData || []) as WorkerCert[];

            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            const staffWithCompliance: StaffMember[] = workers.map(worker => {
                const workerCerts = certs.filter(c => c.worker_id === worker.id);

                let expiredCount = 0;
                let expiringSoonCount = 0;

                workerCerts.forEach(cert => {
                    const expDate = new Date(cert.expiration_date);
                    if (expDate < today) expiredCount++;
                    else if (expDate <= thirtyDaysFromNow) expiringSoonCount++;
                });

                let status: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
                if (expiredCount > 0) status = 'non_compliant';
                else if (expiringSoonCount > 0) status = 'warning';

                return {
                    ...worker,
                    complianceStatus: status,
                    expiredCount,
                    expiringSoonCount,
                    certs: workerCerts.sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())
                };
            });

            setStaff(staffWithCompliance);
        } catch (error) {
            console.error('Error fetching staff data:', error);
            toast.error('Failed to load staff data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadStaff = async () => {
            await fetchStaffData();
        };

        loadStaff();
    }, [fetchStaffData]);

    const handleInviteStaff = async () => {
        if (!inviteFirstName || !inviteLastName || !agencyId) {
            toast.error("Please provide both first and last name.");
            return;
        }

        setIsSubmitting(true);
        try {
            const fakeUuid = crypto.randomUUID();
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteFirstName + ' ' + inviteLastName)}&background=F1F5F9&color=64748B`;

            const { error } = await supabase
                .from('profiles')
                .insert({
                    id: fakeUuid,
                    agency_id: agencyId,
                    role: 'worker',
                    first_name: inviteFirstName,
                    last_name: inviteLastName,
                    avatar_url: avatarUrl
                });

            if (error) throw error;

            toast.success(`${inviteFirstName} has been invited!`);
            setInviteFirstName('');
            setInviteLastName('');
            setIsInviteModalOpen(false);

            fetchStaffData();
        } catch (error) {
            console.error("Error inviting staff:", error);
            toast.error("Failed to add new staff member.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCertification = async () => {
        if (!selectedWorker || !newCertDate) {
            toast.error("Please select an expiration date.");
            return;
        }

        try {
            const { error } = await supabase
                .from('worker_certifications')
                .insert({
                    worker_id: selectedWorker.id,
                    type: newCertType,
                    expiration_date: newCertDate,
                    status: 'active'
                });

            if (error) throw error;

            toast.success("Certification added successfully!");
            setNewCertDate('');
            setIsAddingCert(false);

            fetchStaffData();
            setSelectedWorker(null);
        } catch (error) {
            console.error("Error adding cert:", error);
            toast.error("Failed to add certification.");
        }
    };

    const filteredStaff = staff.filter(member =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <h1>Staff Directory</h1>
                    <p>Manage your team and track compliance requirements.</p>
                </div>
                <button className="btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setIsInviteModalOpen(true)}>
                    <Plus size={18} /> Invite Staff
                </button>
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search staff by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                </div>
            </div>

            <div className={styles.tablePanel}>
                <div className={styles.tableWrapper}>
                    <table className={styles.staffTable}>
                        <thead>
                            <tr>
                                <th>Team Member</th>
                                <th>Role</th>
                                <th>Compliance Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        No staff members found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((member) => (
                                    <tr key={member.id}>
                                        <td>
                                            <div className={styles.profileCell}>
                                                <Image src={member.avatar_url!} alt={member.first_name} width={36} height={36} className={styles.avatar} unoptimized />
                                                <span>{member.first_name} {member.last_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                                            Support Worker
                                        </td>
                                        <td>
                                            {member.complianceStatus === 'compliant' && (
                                                <span className={`${styles.statusBadge} ${styles.compliant}`}><ShieldCheck size={14} /> Compliant</span>
                                            )}
                                            {member.complianceStatus === 'warning' && (
                                                <span className={`${styles.statusBadge} ${styles.warning}`}><AlertTriangle size={14} /> Action Required</span>
                                            )}
                                            {member.complianceStatus === 'non_compliant' && (
                                                <span className={`${styles.statusBadge} ${styles.non_compliant}`}><XCircle size={14} /> Non-Compliant</span>
                                            )}
                                        </td>
                                        <td>
                                            <button className={styles.actionBtn} onClick={() => setSelectedWorker(member)}>
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isInviteModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Invite Support Worker</h2>
                            <button className={styles.closeBtn} onClick={() => setIsInviteModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                            Add a new support worker to your agency. They will appear in your rostering system immediately.
                        </p>

                        <div className={styles.formGroup}>
                            <label>First Name</label>
                            <input type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder="e.g. John" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Last Name</label>
                            <input type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder="e.g. Doe" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="email" placeholder="john@example.com" style={{ width: '100%', paddingLeft: '36px' }} />
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setIsInviteModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                            <button className="btn-primary" onClick={handleInviteStaff} disabled={isSubmitting}>
                                {isSubmitting ? 'Inviting...' : 'Send Invitation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedWorker && (
                <div className={styles.drawerOverlay} onClick={() => setSelectedWorker(null)}>
                    <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>

                        <div className={styles.drawerHeader}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <Image src={selectedWorker.avatar_url!} alt="Avatar" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
                                <div>
                                    <h2 style={{ fontSize: '1.4rem', color: 'var(--text-dark)', marginBottom: '4px' }}>
                                        {selectedWorker.first_name} {selectedWorker.last_name}
                                    </h2>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '4px' }}>
                                        Support Worker
                                    </span>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setSelectedWorker(null)}><X size={24} /></button>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-dark)' }}>Certifications & Compliance</h3>

                        {selectedWorker.certs.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>No certifications on file.</p>
                        ) : (
                            <div style={{ marginBottom: '24px' }}>
                                {selectedWorker.certs.map(cert => {
                                    const isExpired = new Date(cert.expiration_date) < new Date();
                                    return (
                                        <div key={cert.id} className={styles.certCard}>
                                            <div>
                                                <p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{cert.type}</p>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {isExpired ? (
                                                <span className={`${styles.statusBadge} ${styles.non_compliant}`}>Expired</span>
                                            ) : (
                                                <span className={`${styles.statusBadge} ${styles.compliant}`}>Valid</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {isAddingCert ? (
                            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div className={styles.formGroup}>
                                    <label>Certification Type</label>
                                    <select value={newCertType} onChange={(e) => setNewCertType(e.target.value)}>
                                        <option value="First Aid & CPR">First Aid & CPR</option>
                                        <option value="Manual Handling">Manual Handling</option>
                                        <option value="Police Check">Police Check</option>
                                        <option value="NDIS Worker Screening">NDIS Worker Screening</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Expiration Date</label>
                                    <input type="date" value={newCertDate} onChange={(e) => setNewCertDate(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddCertification}>Save Record</button>
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddingCert(false)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="btn-secondary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px' }}
                                onClick={() => setIsAddingCert(true)}
                            >
                                <FileCheck size={18} /> Log New Certification
                            </button>
                        )}

                    </div>
                </div>
            )}

        </div>
    );
}