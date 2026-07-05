// src/app/admin/staff/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Loader2, Plus, ShieldCheck, AlertTriangle, XCircle, Search, X, FileCheck, Mail, Phone, Trash2, CheckCircle, Circle
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
  email: string | null; 
  phone: string | null; 
}

interface StaffMember extends WorkerProfile {
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';
  expiringSoonCount: number;
  expiredCount: number;
  certs: WorkerCert[];
}

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  medical_condition_tag: string;
}

export default function StaffPage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyId, setAgencyId] = useState<string | null>(null);

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState(''); 
  const [invitePhone, setInvitePhone] = useState(''); 
  const [invitePassword, setInvitePassword] = useState(''); // NEW: Needed for real auth
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drawer States
  const [selectedWorker, setSelectedWorker] = useState<StaffMember | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'patients'>('profile');
  const [isAddingCert, setIsAddingCert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newCertType, setNewCertType] = useState('First Aid & CPR');
  const [newCertDate, setNewCertDate] = useState('');

  // Patient Assignment States
  const [agencyPatients, setAgencyPatients] = useState<Participant[]>([]);
  const [assignedPatientIds, setAssignedPatientIds] = useState<Set<string>>(new Set());
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Main Data Fetch
  const fetchStaffData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: adminProfile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single();
      if (!adminProfile) throw new Error("Admin profile not found");
      
      const currentAgencyId = adminProfile.agency_id;
      setAgencyId(currentAgencyId);

      const { data: workersData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role, email, phone')
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
        let expiredCount = 0, expiringSoonCount = 0;

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
          complianceStatus: status, expiredCount, expiringSoonCount,
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
    const initData = async () => {
        await fetchStaffData();
    };
    initData();
  }, [fetchStaffData]);

  // Fetch Patients for Drawer
  const fetchWorkerPatients = async (workerId: string, currentAgencyId: string) => {
    setLoadingPatients(true);
    try {
      const { data: participants, error: pError } = await supabase.from('participants').select('id, first_name, last_name, medical_condition_tag').eq('agency_id', currentAgencyId);
      if (pError) throw pError;
      setAgencyPatients(participants || []);

      const { data: assignments, error: aError } = await supabase.from('worker_participants').select('participant_id').eq('worker_id', workerId);
      if (aError) throw aError;
      
      setAssignedPatientIds(new Set(assignments?.map(a => a.participant_id) || []));
    } catch (error) {
      toast.error('Failed to load patient roster.');
    } finally {
      setLoadingPatients(false);
    }
  };

  const openWorkerProfile = (worker: StaffMember) => {
    setSelectedWorker(worker);
    setDrawerTab('profile');
    setIsAddingCert(false);
    if (agencyId) {
      fetchWorkerPatients(worker.id, agencyId);
    }
  };

  // --- CRUD ACTIONS ---
  const handleInviteStaff = async () => {
    if (!inviteFirstName || !inviteLastName || !inviteEmail || !invitePassword || !agencyId) {
      return toast.error("Please provide all required fields.");
    }
    if (invitePassword.length < 6) return toast.error("Password must be at least 6 characters.");
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: inviteFirstName,
          lastName: inviteLastName,
          email: inviteEmail,
          password: invitePassword,
          role: 'worker',
          agencyId: agencyId
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create user');

      toast.success(`${inviteFirstName} has been invited!`);
      setInviteFirstName(''); setInviteLastName(''); setInviteEmail(''); setInvitePhone(''); setInvitePassword('');
      setIsInviteModalOpen(false);
      fetchStaffData(); 
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error("Failed to add new staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedWorker) return;
    const confirmDelete = window.confirm(`Permanently delete ${selectedWorker.first_name}? This will remove their access to Bellvi.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedWorker.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      toast.success('Staff member deleted successfully.');
      setSelectedWorker(null);
      fetchStaffData();
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error('Failed to delete staff member.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCertification = async () => {
    if (!selectedWorker || !newCertDate) return toast.error("Please select an expiration date.");
    try {
      const response = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: selectedWorker.id, type: newCertType, expirationDate: newCertDate }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add certification');
      toast.success("Certification added!");
      setNewCertDate(''); setIsAddingCert(false);
      fetchStaffData(); setSelectedWorker(null);
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error("Failed to add certification.");
    }
  };

  const togglePatientAssignment = async (participantId: string) => {
    if (!selectedWorker) return;
    const isAssigned = assignedPatientIds.has(participantId);

    // Optimistic Update
    const newSet = new Set(assignedPatientIds);
    if (isAssigned) newSet.delete(participantId);
    else newSet.add(participantId);
    setAssignedPatientIds(newSet);

    try {
      const response = await fetch('/api/staff/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorker.id,
          participantId,
          action: isAssigned ? 'unassign' : 'assign',
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update assignment');
      }
    } catch (error) {
      toast.error('Failed to update assignment.');
      if (agencyId) fetchWorkerPatients(selectedWorker.id, agencyId); // Revert optimistic update
    }
  };

  const filteredStaff = staff.filter(member => `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className={styles.loaderContainer}><Loader2 className="animate-spin" size={32} color="var(--text-muted)" /></div>;

  return (
    <div className={styles.pageContainer}>
      
      <div className={styles.header}>
        <div><h1>Staff Directory</h1><p>Manage your team and track compliance requirements.</p></div>
        <button className="btn-primary staff" onClick={() => setIsInviteModalOpen(true)}><Plus size={18} /> <span>Invite Staff</span></button>
      </div>

      <div className={styles.searchBarWrapper}>
        <div className={styles.searchInputContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input type="text" placeholder="Search staff by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} />
        </div>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.staffTable}>
            <thead><tr><th>Team Member</th><th>Role</th><th>Compliance Status</th><th>Action</th></tr></thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={4} className={styles.emptyTableText}>No staff members found.</td></tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className={styles.profileCell}>
                        <Image src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.first_name}+${member.last_name}`} alt="avatar" width={36} height={36} className={styles.avatar} unoptimized />
                        <span>{member.first_name} {member.last_name}</span>
                      </div>
                    </td>
                    <td className={styles.roleCell}>Support Worker</td>
                    <td>
                      {member.complianceStatus === 'compliant' && <span className={`${styles.statusBadge} ${styles.compliant}`}><ShieldCheck size={14} /> Compliant</span>}
                      {member.complianceStatus === 'warning' && <span className={`${styles.statusBadge} ${styles.warning}`}><AlertTriangle size={14} /> Action Required</span>}
                      {member.complianceStatus === 'non_compliant' && <span className={`${styles.statusBadge} ${styles.non_compliant}`}><XCircle size={14} /> Non-Compliant</span>}
                    </td>
                    <td><button className={styles.actionBtn} onClick={() => openWorkerProfile(member)}>Manage</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: INVITE STAFF --- */}
      {isInviteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Invite Support Worker</h2>
              <button className={styles.closeBtn} onClick={() => setIsInviteModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className={styles.formGroup}><label>First Name</label><input type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder="John" /></div>
              <div className={styles.formGroup}><label>Last Name</label><input type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder="Doe" /></div>
            </div>
            
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <div className={styles.inputWithIcon}>
                <Mail size={16} className={styles.inputIcon} />
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@example.com" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <div className={styles.inputWithIcon}>
                  <Phone size={16} className={styles.inputIcon} />
                  <input type="tel" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="0400 000 000" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Temp Password</label>
                <input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="••••••••" style={{ padding: '10px 12px' }} />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsInviteModalOpen(false)} disabled={isSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={handleInviteStaff} disabled={isSubmitting}>{isSubmitting ? 'Inviting...' : 'Send Invitation'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DRAWER: MANAGE WORKER PROFILE --- */}
      {selectedWorker && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedWorker(null)}>
          <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
            
            <div className={styles.drawerHeader}>
              <div className={styles.drawerHeaderProfile}>
                <Image src={selectedWorker.avatar_url || `https://ui-avatars.com/api/?name=${selectedWorker.first_name}+${selectedWorker.last_name}`} alt="Avatar" width={64} height={64} className={styles.drawerAvatar} unoptimized />
                <div>
                  <h2>{selectedWorker.first_name} {selectedWorker.last_name}</h2>
                  <span className={styles.drawerRoleBadge}>Support Worker</span>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedWorker(null)}><X size={24} /></button>
            </div>

            {/* DRAWER TABS */}
            <div className={styles.drawerTabs}>
              <button className={`${styles.tabBtn} ${drawerTab === 'profile' ? styles.active : ''}`} onClick={() => setDrawerTab('profile')}>
                Profile & Certs
              </button>
              <button className={`${styles.tabBtn} ${drawerTab === 'patients' ? styles.active : ''}`} onClick={() => setDrawerTab('patients')}>
                Patient Roster ({assignedPatientIds.size})
              </button>
            </div>

            {/* TAB: PROFILE & CERTS */}
            {drawerTab === 'profile' && (
              <>
                <div className={styles.contactInfoBox}>
                  <div className={styles.contactRow}><Mail size={16} /> <a href={`mailto:${selectedWorker.email || ''}`}>{selectedWorker.email || 'No email provided'}</a></div>
                  <div className={styles.contactRow}><Phone size={16} /> <a href={`tel:${selectedWorker.phone || ''}`}>{selectedWorker.phone || 'No phone provided'}</a></div>
                </div>

                <h3 className={styles.drawerSectionTitle} style={{ marginTop: '24px' }}>Certifications & Compliance</h3>
                
                {selectedWorker.certs.length === 0 ? (
                  <p className={styles.emptyText}>No certifications on file.</p>
                ) : (
                  <div className={styles.certList}>
                    {selectedWorker.certs.map(cert => {
                      const isExpired = new Date(cert.expiration_date) < new Date();
                      return (
                        <div key={cert.id} className={styles.certCard}>
                          <div><p className={styles.certType}>{cert.type}</p><p className={styles.certDate}>Expires: {new Date(cert.expiration_date).toLocaleDateString()}</p></div>
                          {isExpired ? <span className={`${styles.statusBadge} ${styles.non_compliant}`}>Expired</span> : <span className={`${styles.statusBadge} ${styles.compliant}`}>Valid</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isAddingCert ? (
                  <div className={styles.addCertBox}>
                    <div className={styles.formGroup}>
                      <label>Certification Type</label>
                      <select value={newCertType} onChange={(e) => setNewCertType(e.target.value)}>
                        <option value="First Aid & CPR">First Aid & CPR</option><option value="Manual Handling">Manual Handling</option><option value="Police Check">Police Check</option><option value="NDIS Worker Screening">NDIS Worker Screening</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}><label>Expiration Date</label><input type="date" value={newCertDate} onChange={(e) => setNewCertDate(e.target.value)} /></div>
                    <div className={styles.addCertActions}>
                      <button className="btn-primary" onClick={handleAddCertification}>Save Record</button>
                      <button className="btn-secondary" onClick={() => setIsAddingCert(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className={`btn-secondary ${styles.logCertBtn}`} onClick={() => setIsAddingCert(true)}><FileCheck size={18} /> Log New Certification</button>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                  <button className="btn-secondary" onClick={handleDeleteStaff} disabled={isDeleting} style={{ width: '100%', color: '#EF4444', borderColor: '#FCA5A5', justifyContent: 'center' }}>
                    <Trash2 size={16} style={{ marginRight: '8px' }}/> {isDeleting ? 'Removing...' : 'Remove Staff Member'}
                  </button>
                </div>
              </>
            )}

            {/* TAB: PATIENT ROSTER */}
            {drawerTab === 'patients' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Assign patients to this worker for rostering purposes.</p>
                {loadingPatients ? (
                   <Loader2 className="animate-spin" size={24} color="var(--text-muted)" style={{ margin: '24px auto' }} />
                ) : agencyPatients.length === 0 ? (
                  <p className={styles.emptyText}>No patients found in your agency.</p>
                ) : (
                  agencyPatients.map(patient => {
                    const isAssigned = assignedPatientIds.has(patient.id);
                    return (
                      <div 
                        key={patient.id} 
                        onClick={() => togglePatientAssignment(patient.id)}
                        className={`${styles.patientCard} ${isAssigned ? styles.assigned : ''}`}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-dark)' }}>{patient.first_name} {patient.last_name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient.medical_condition_tag}</span>
                        </div>
                        {isAssigned ? <CheckCircle color="#38BDF8" size={20} /> : <Circle color="#CBD5E1" size={20} />}
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}