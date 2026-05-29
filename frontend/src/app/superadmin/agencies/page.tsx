// src/app/(superadmin)/agencies/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Building2, Plus, X, Save, Mail, Phone, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../superadmin.module.scss'; 

// --- TYPES ---
interface Agency {
  id: string;
  name: string;
  created_at: string;
}

interface EnhancedStaff {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';
  totalShifts: number;
  uniquePatients: number;
}

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  ndis_id: string | null;
  medical_condition_tag: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export default function AgenciesPage() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Drawer States
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [editAgencyName, setEditAgencyName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Drawer Internal States
  const [drawerTab, setDrawerTab] = useState<'details' | 'staff' | 'participants'>('details');
  const [loadingDrawerData, setLoadingDrawerData] = useState(false);
  const [agencyStaff, setAgencyStaff] = useState<EnhancedStaff[]>([]);
  const [agencyParticipants, setAgencyParticipants] = useState<Participant[]>([]);

  const fetchAgencies = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      toast.error('Failed to load agencies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      await fetchAgencies();
    };
    initData();
  }, [fetchAgencies]);

  // Fetch all related data for the drawer
  const fetchDrawerData = async (agencyId: string) => {
    setLoadingDrawerData(true);
    try {
      // 1. Fetch Staff
      const { data: staffData } = await supabase.from('profiles').select('*').eq('agency_id', agencyId).order('first_name');
      const rawStaff = staffData || [];

      // 2. Fetch Participants
      const { data: partData } = await supabase.from('participants').select('*').eq('agency_id', agencyId).order('first_name');
      setAgencyParticipants(partData || []);

      // 3. Fetch Shifts for cross-referencing
      const { data: shiftsData } = await supabase.from('shifts').select('worker_id, participant_id').eq('agency_id', agencyId);
      const shifts = shiftsData || [];

      // 4. Fetch Certifications for compliance check
      const workerIds = rawStaff.map(s => s.id);
      const { data: certsData } = await supabase.from('worker_certifications').select('worker_id, expiration_date').in('worker_id', workerIds.length ? workerIds : ['placeholder']);
      const certs = certsData || [];

      // 5. Process & Combine Data
      const today = new Date();
      const thirtyDays = new Date(); thirtyDays.setDate(today.getDate() + 30);

      const enhanced: EnhancedStaff[] = rawStaff.map(worker => {
        // Calculate Compliance
        const workerCerts = certs.filter(c => c.worker_id === worker.id);
        let expired = 0, warning = 0;
        workerCerts.forEach(c => {
          const expDate = new Date(c.expiration_date);
          if (expDate < today) expired++;
          else if (expDate <= thirtyDays) warning++;
        });
        
        let compliance: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
        if (expired > 0) compliance = 'non_compliant';
        else if (warning > 0) compliance = 'warning';

        // Calculate Shifts & Unique Patients
        const workerShifts = shifts.filter(s => s.worker_id === worker.id);
        const uniquePatientsCount = new Set(workerShifts.map(s => s.participant_id)).size;

        return {
          ...worker,
          complianceStatus: compliance,
          totalShifts: workerShifts.length,
          uniquePatients: uniquePatientsCount
        };
      });

      setAgencyStaff(enhanced);
    } catch (error) {
      toast.error('Failed to load agency details.');
    } finally {
      setLoadingDrawerData(false);
    }
  };

  const handleCreateAgency = async () => {
    if (!newAgencyName.trim()) return toast.error('Agency name is required');
    setIsCreating(true);
    try {
      const { error } = await supabase.from('agencies').insert({ name: newAgencyName });
      if (error) throw error;
      toast.success('Agency created!');
      setNewAgencyName('');
      setIsCreateModalOpen(false);
      fetchAgencies(); 
    } catch (error) {
      toast.error('Failed to create agency.');
    } finally {
      setIsCreating(false);
    }
  };

  const openManageDrawer = (agency: Agency) => {
    setSelectedAgency(agency);
    setEditAgencyName(agency.name);
    setDrawerTab('details'); // Reset tab
    fetchDrawerData(agency.id);
  };

  const handleUpdateAgency = async () => {
    if (!selectedAgency || !editAgencyName.trim()) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('agencies').update({ name: editAgencyName }).eq('id', selectedAgency.id);
      if (error) throw error;
      toast.success('Agency updated!');
      fetchAgencies(); 
      setSelectedAgency(null);
    } catch (error) {
      toast.error('Failed to update.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <div className={styles.loaderContainer}><Loader2 className="animate-spin" size={32} color="var(--text-muted)" /></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <h1>Manage Agencies</h1>
          <p>View and register new tenant clinics in the platform.</p>
        </div>
        <button className="btn-primary staff" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} /> Onboard Agency
        </button>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Agency Name</th>
                <th>System ID (UUID)</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr><td colSpan={5} className={styles.emptyState}>No agencies found.</td></tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.id}>
                    <td className={styles.nameCell}>
                      <div className={styles.flexIcon}><Building2 size={16} color="var(--text-muted)" />{agency.name}</div>
                    </td>
                    <td className={styles.idCell}>{agency.id}</td>
                    <td><span className={`${styles.statusBadge} ${styles.active}`}>Active</span></td>
                    <td>{new Date(agency.created_at).toLocaleDateString()}</td>
                    <td><button className={styles.actionBtn} onClick={() => openManageDrawer(agency)}>Manage</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Register New Agency</h2>
              <button className={styles.closeBtn} onClick={() => setIsCreateModalOpen(false)}><X size={20} /></button>
            </div>
            <div className={styles.formGroup}>
              <label>Agency / Clinic Name</label>
              <input type="text" value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} placeholder="e.g. Ocean View Care" />
            </div>
            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateAgency} disabled={isCreating}>{isCreating ? 'Saving...' : 'Register Agency'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANAGE AGENCY DRAWER --- */}
      {selectedAgency && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedAgency(null)}>
          <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Manage Tenant</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedAgency(null)}><X size={24} /></button>
            </div>

            {/* DRAWER TABS */}
            <div className={styles.drawerTabs}>
              <button className={`${styles.tabBtn} ${drawerTab === 'details' ? styles.active : ''}`} onClick={() => setDrawerTab('details')}>
                Settings
              </button>
              <button className={`${styles.tabBtn} ${drawerTab === 'staff' ? styles.active : ''}`} onClick={() => setDrawerTab('staff')}>
                Staff ({agencyStaff.length})
              </button>
              <button className={`${styles.tabBtn} ${drawerTab === 'participants' ? styles.active : ''}`} onClick={() => setDrawerTab('participants')}>
                Patients ({agencyParticipants.length})
              </button>
            </div>

            {/* TAB CONTENT: DETAILS */}
            {drawerTab === 'details' && (
              <>
                <div className={styles.formGroup}>
                  <label>System ID (UUID)</label>
                  <input type="text" value={selectedAgency.id} disabled />
                </div>
                <div className={styles.formGroup}>
                  <label>Agency Name</label>
                  <input type="text" value={editAgencyName} onChange={(e) => setEditAgencyName(e.target.value)} />
                </div>
                <div className={styles.modalActions} style={{ marginTop: 'auto' }}>
                  <button className="btn-secondary" onClick={() => setSelectedAgency(null)} disabled={isUpdating}>Cancel</button>
                  <button className="btn-primary" onClick={handleUpdateAgency} disabled={isUpdating} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Save size={16} />{isUpdating ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}

            {/* TAB CONTENT: STAFF */}
            {drawerTab === 'staff' && (
              <div className={styles.listContainer}>
                {loadingDrawerData ? (
                  <Loader2 className="animate-spin" size={24} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                ) : agencyStaff.length === 0 ? (
                  <p className={styles.emptyState}>No staff registered.</p>
                ) : (
                  agencyStaff.map(staff => (
                    <div key={staff.id} className={styles.richCard}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardProfile}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={staff.avatar_url || `https://ui-avatars.com/api/?name=${staff.first_name}+${staff.last_name}&background=F1F5F9&color=64748B`} alt="avatar" width={44} height={44} />
                          <div>
                            <strong>{staff.first_name} {staff.last_name}</strong>
                            <span>{staff.role.replace('_', ' ')}</span>
                          </div>
                        </div>
                        {staff.complianceStatus === 'compliant' && <span className={`${styles.statusBadge} ${styles.active}`}><CheckCircle size={12}/> Compliant</span>}
                        {staff.complianceStatus === 'warning' && <span className={`${styles.statusBadge} ${styles.super_admin}`}><Clock size={12}/> Warning</span>}
                        {staff.complianceStatus === 'non_compliant' && <span className={`${styles.statusBadge} ${styles.inactive}`}><ShieldAlert size={12}/> Expired</span>}
                      </div>
                      
                      <div className={styles.statsGrid}>
                        <div className={styles.statBox}>
                          <span>Total Shifts</span>
                          <strong>{staff.totalShifts} Assigned</strong>
                        </div>
                        <div className={styles.statBox}>
                          <span>Patient Roster</span>
                          <strong>{staff.uniquePatients} Unique</strong>
                        </div>
                      </div>

                      {(staff.email || staff.phone) && (
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                          {staff.email && <div className={styles.contactRow}><Mail size={14}/> {staff.email}</div>}
                          {staff.phone && <div className={styles.contactRow}><Phone size={14}/> {staff.phone}</div>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: PARTICIPANTS */}
            {drawerTab === 'participants' && (
              <div className={styles.listContainer}>
                {loadingDrawerData ? (
                  <Loader2 className="animate-spin" size={24} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                ) : agencyParticipants.length === 0 ? (
                  <p className={styles.emptyState}>No patients registered.</p>
                ) : (
                  agencyParticipants.map(patient => (
                    <div key={patient.id} className={styles.richCard}>
                      <div className={styles.cardHeader} style={{ marginBottom: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-dark)', display: 'block' }}>
                            {patient.first_name} {patient.last_name}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NDIS: {patient.ndis_id || 'Pending'}</span>
                        </div>
                        <span className={`${styles.tagBadge} ${styles[patient.medical_condition_tag] || styles.general}`}>
                          {patient.medical_condition_tag}
                        </span>
                      </div>
                      
                      {patient.emergency_contact_name && (
                        <div className={styles.statsGrid} style={{ marginTop: '12px', paddingTop: '12px' }}>
                          <div className={styles.statBox}>
                            <span>Emergency Contact</span>
                            <strong>{patient.emergency_contact_name}</strong>
                          </div>
                          <div className={styles.statBox}>
                            <span>Phone</span>
                            <strong>{patient.emergency_contact_phone || 'N/A'}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}