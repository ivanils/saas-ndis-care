// src/app/(superadmin)/users/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Plus, X, Save, Trash2, CheckCircle, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../superadmin.module.scss';

// --- TYPES ---
interface GlobalUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  agency_id: string | null;
  agencies: { name: string } | null;
}

interface AgencyOption {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  medical_condition_tag: string;
}

export default function GlobalUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'worker', agencyId: ''
  });

  // Drawer States
  const [selectedUser, setSelectedUser] = useState<GlobalUser | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'patients'>('profile');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '', lastName: '', role: '', agencyId: ''
  });

  // Patient Assignment States
  const [agencyPatients, setAgencyPatients] = useState<Participant[]>([]);
  const [assignedPatientIds, setAssignedPatientIds] = useState<Set<string>>(new Set());
  const [loadingPatients, setLoadingPatients] = useState(false);

  // --- FETCHING DATA ---
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select(`id, first_name, last_name, email, role, agency_id, agencies (name)`).order('created_at', { ascending: false });
      if (error) throw error;
      
      const mappedUsers = ((data as unknown as GlobalUser[]) || []).map(u => ({ ...u, agencies: u.agencies ? { name: u.agencies.name } : null }));
      setUsers(mappedUsers);
    } catch (error) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgencies = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('agencies').select('id, name').order('name');
      if (error) throw error;
      setAgencies(data || []);
      setFormData(prev => (data && data.length > 0 && !prev.agencyId) ? { ...prev, agencyId: data[0].id } : prev);
    } catch (error) {
      toast.error('Failed to load agencies.');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchUsers(), fetchAgencies()]);
    };
    fetchData();
  }, [fetchUsers, fetchAgencies]);

  const fetchUserPatients = async (userId: string, agencyId: string | null) => {
    if (!agencyId) return; 
    setLoadingPatients(true);
    try {
      // 1. Fetch all participants for this agency
      const { data: participants, error: pError } = await supabase.from('participants').select('id, first_name, last_name, medical_condition_tag').eq('agency_id', agencyId);
      if (pError) throw pError;
      setAgencyPatients(participants || []);

      // 2. Fetch assigned participants for this specific worker
      const { data: assignments, error: aError } = await supabase.from('worker_participants').select('participant_id').eq('worker_id', userId);
      if (aError) throw aError;
      
      const assignedIds = new Set(assignments?.map(a => a.participant_id) || []);
      setAssignedPatientIds(assignedIds);
    } catch (error) {
      toast.error('Failed to load patient roster.');
    } finally {
      setLoadingPatients(false);
    }
  };

  // --- CRUD ACTIONS ---
  const handleCreateUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) return toast.error('Please fill in all fields.');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, agencyId: formData.agencyId === '' ? null : formData.agencyId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success('User created!');
      setIsModalOpen(false);
      fetchUsers(); 
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openManageDrawer = (user: GlobalUser) => {
    setSelectedUser(user);
    setDrawerTab('profile');
    setEditFormData({ firstName: user.first_name, lastName: user.last_name, role: user.role, agencyId: user.agency_id || '' });
    fetchUserPatients(user.id, user.agency_id);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: editFormData.firstName, last_name: editFormData.lastName, role: editFormData.role, agency_id: editFormData.agencyId === '' ? null : editFormData.agencyId
      }).eq('id', selectedUser.id);
      if (error) throw error;
      toast.success('User updated!');
      fetchUsers(); 
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const confirmDelete = window.confirm(`Are you absolutely sure you want to permanently delete ${selectedUser.first_name}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      toast.success('User deleted successfully.');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePatientAssignment = async (participantId: string) => {
    if (!selectedUser) return;
    const isAssigned = assignedPatientIds.has(participantId);
    
    // Optimistic UI Update
    const newSet = new Set(assignedPatientIds);
    if (isAssigned) newSet.delete(participantId);
    else newSet.add(participantId);
    setAssignedPatientIds(newSet);

    try {
      if (isAssigned) {
        await supabase.from('worker_participants').delete().match({ worker_id: selectedUser.id, participant_id: participantId });
      } else {
        await supabase.from('worker_participants').insert({ worker_id: selectedUser.id, participant_id: participantId });
      }
    } catch (error) {
      toast.error('Failed to update assignment.');
      // Revert UI on failure
      fetchUserPatients(selectedUser.id, selectedUser.agency_id);
    }
  };

  if (loading) return <div className={styles.loaderContainer}><Loader2 className="animate-spin" size={32} color="var(--text-muted)" /></div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div><h1>Global Platform Users</h1><p>Directory of all registered workers, admins, and system operators.</p></div>
        <button className="btn-primary staff" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Create User</button>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead><tr><th>User Name</th><th>Email Contact</th><th>Tenant (Agency)</th><th>System Role</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16} color="var(--text-muted)" />{user.first_name} {user.last_name}</div></td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.agencies ? <span style={{ fontWeight: 500 }}>{user.agencies.name}</span> : <span style={{ color: 'var(--text-muted)' }}>System Operator</span>}</td>
                  <td><span className={`${styles.statusBadge} ${styles[user.role] || styles.active}`}>{user.role.replace('_', ' ')}</span></td>
                  <td><button className={styles.actionBtn} onClick={() => openManageDrawer(user)}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE USER MODAL --- */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New User</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className={styles.formGroup}>
                <label>First Name</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john.doe@example.com" />
            </div>

            <div className={styles.formGroup}>
              <label>Temporary Password</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className={styles.formGroup}>
                <label>System Role</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <option value="worker">Care Worker</option>
                  <option value="admin">Agency Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Assign to Agency</label>
                <select value={formData.agencyId} onChange={(e) => setFormData({...formData, agencyId: e.target.value})} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <option value="">-- No Agency (Global) --</option>
                  {agencies.map(agency => (
                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateUser} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANAGE USER DRAWER --- */}
      {selectedUser && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Manage User</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}><X size={24} /></button>
            </div>

            {/* TABS */}
            <div className={styles.drawerTabs}>
              <button className={`${styles.tabBtn} ${drawerTab === 'profile' ? styles.active : ''}`} onClick={() => setDrawerTab('profile')}>
                Profile Details
              </button>
              <button className={`${styles.tabBtn} ${drawerTab === 'patients' ? styles.active : ''}`} onClick={() => setDrawerTab('patients')}>
                Patient Roster ({assignedPatientIds.size})
              </button>
            </div>

            {/* TAB: PROFILE */}
            {drawerTab === 'profile' && (
              <>
                <div className={styles.formGroup}><label>System ID</label><input type="text" value={selectedUser.id} disabled style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} /></div>
                <div className={styles.formGroup}><label>Email Address</label><input type="text" value={selectedUser.email || ''} disabled /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className={styles.formGroup}><label>First Name</label><input type="text" value={editFormData.firstName} onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})} /></div>
                  <div className={styles.formGroup}><label>Last Name</label><input type="text" value={editFormData.lastName} onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})} /></div>
                </div>
                <div className={styles.formGroup}>
                  <label>System Role</label>
                  <select value={editFormData.role} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <option value="worker">Care Worker</option><option value="admin">Agency Admin</option><option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Assigned Tenant</label>
                  <select value={editFormData.agencyId} onChange={(e) => setEditFormData({...editFormData, agencyId: e.target.value})} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <option value="">-- No Agency --</option>
                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div className={styles.modalActions} style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-secondary" onClick={handleDeleteUser} disabled={isDeleting} style={{ color: '#EF4444', borderColor: '#FCA5A5' }}>
                    <Trash2 size={16} style={{ marginRight: '6px' }}/> {isDeleting ? 'Deleting...' : 'Delete User'}
                  </button>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => setSelectedUser(null)}>Cancel</button>
                    <button className="btn-primary" onClick={handleUpdateUser} disabled={isUpdating}><Save size={16} style={{ marginRight: '6px' }}/> Save</button>
                  </div>
                </div>
              </>
            )}

            {/* TAB: PATIENTS */}
            {drawerTab === 'patients' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Assign patients from this agency to the workers direct roster.</p>
                {loadingPatients ? (
                   <Loader2 className="animate-spin" size={24} color="var(--text-muted)" style={{ margin: '24px auto' }} />
                ) : agencyPatients.length === 0 ? (
                  <p className={styles.emptyState}>No patients found in this agency.</p>
                ) : (
                  agencyPatients.map(patient => {
                    const isAssigned = assignedPatientIds.has(patient.id);
                    return (
                      <div 
                        key={patient.id} 
                        onClick={() => togglePatientAssignment(patient.id)}
                        style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', 
                          border: `1px solid ${isAssigned ? '#38BDF8' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', 
                          backgroundColor: isAssigned ? '#F0F9FF' : '#FFF', cursor: 'pointer', transition: 'all 0.2s'
                        }}
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