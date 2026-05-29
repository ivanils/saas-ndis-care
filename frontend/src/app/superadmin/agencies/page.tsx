// src/app/(superadmin)/agencies/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Building2, Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../superadmin.module.scss'; // Reusing shared styles

interface Agency {
  id: string;
  name: string;
  created_at: string;
}

export default function AgenciesPage() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  // Create Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Manage Drawer States
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [editAgencyName, setEditAgencyName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch Agencies
  const fetchAgencies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
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

  // Handle Create Agency
  const handleCreateAgency = async () => {
    if (!newAgencyName.trim()) {
      toast.error('Agency name is required');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .insert({ name: newAgencyName });

      if (error) throw error;

      toast.success('Agency created successfully!');
      setNewAgencyName('');
      setIsCreateModalOpen(false);
      fetchAgencies(); 
    } catch (error) {
      console.error('Error creating agency:', error);
      toast.error('Failed to create agency.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Open Manage Drawer
  const openManageDrawer = (agency: Agency) => {
    setSelectedAgency(agency);
    setEditAgencyName(agency.name);
  };

  // Handle Update Agency
  const handleUpdateAgency = async () => {
    if (!selectedAgency) return;
    if (!editAgencyName.trim()) {
      toast.error('Agency name cannot be empty');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ name: editAgencyName })
        .eq('id', selectedAgency.id);

      if (error) throw error;

      toast.success('Agency updated successfully!');
      fetchAgencies(); 
      setSelectedAgency(null); // Close Drawer
    } catch (error) {
      console.error('Error updating agency:', error);
      toast.error('Failed to update agency details.');
    } finally {
      setIsUpdating(false);
    }
  };

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
          <h1>Manage Agencies</h1>
          <p>View and register new tenant clinics in the platform.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
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
                <tr>
                  <td colSpan={5} className={styles.emptyState}>No agencies found.</td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.id}>
                    <td className={styles.nameCell}>
                      <div className={styles.flexIcon}>
                        <Building2 size={16} color="var(--text-muted)" />
                        {agency.name}
                      </div>
                    </td>
                    <td className={styles.idCell}>
                      {agency.id}
                    </td>
                    <td><span className={`${styles.statusBadge} ${styles.active}`}>Active</span></td>
                    <td>{new Date(agency.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className={styles.actionBtn} onClick={() => openManageDrawer(agency)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE AGENCY MODAL --- */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Register New Agency</h2>
              <button className={styles.closeBtn} onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label>Agency / Clinic Name</label>
              <input 
                type="text" 
                value={newAgencyName} 
                onChange={(e) => setNewAgencyName(e.target.value)} 
                placeholder="e.g. Ocean View Care" 
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateAgency} disabled={isCreating}>
                {isCreating ? 'Saving...' : 'Register Agency'}
              </button>
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
              <button className={styles.closeBtn} onClick={() => setSelectedAgency(null)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>System ID (UUID)</label>
              <input type="text" value={selectedAgency.id} disabled />
            </div>

            <div className={styles.formGroup}>
              <label>Agency Name</label>
              <input 
                type="text" 
                value={editAgencyName} 
                onChange={(e) => setEditAgencyName(e.target.value)} 
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tenant Status</label>
              <input type="text" value="Active (Production)" disabled />
            </div>

            <div className={styles.modalActions} style={{ marginTop: 'auto' }}>
              <button className="btn-secondary" onClick={() => setSelectedAgency(null)} disabled={isUpdating}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateAgency} disabled={isUpdating} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Save size={16} />
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}