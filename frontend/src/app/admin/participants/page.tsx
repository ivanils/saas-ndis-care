// src/app/admin/participants/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Search, X, MapPin, User, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.scss';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type ConditionTag = 'general' | 'support' | 'alert';

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  ndis_id: string | null;
  address: string | null;
  emergency_contact: string | null;
  medical_alerts: string | null;
  medical_condition_tag: ConditionTag | null;
}

const TAG_LABELS: Record<ConditionTag, string> = {
  general: 'General Care',
  support: 'High Support',
  alert: 'Medical Alert',
};

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return session.access_token;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- MODAL STATE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // --- FORM FIELDS ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ndisId, setNdisId] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalAlerts, setMedicalAlerts] = useState('');
  const [conditionTag, setConditionTag] = useState<ConditionTag>('general');

  const fetchParticipants = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/participants/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch participants');
      const data: Participant[] = await res.json();
      setParticipants(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load participants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const openCreateModal = () => {
    setEditingParticipant(null);
    setFirstName(''); setLastName(''); setNdisId('');
    setAddress(''); setEmergencyContact(''); setMedicalAlerts('');
    setConditionTag('general');
    setModalOpen(true);
  };

  const openEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setFirstName(p.first_name);
    setLastName(p.last_name);
    setNdisId(p.ndis_id || '');
    setAddress(p.address || '');
    setEmergencyContact(p.emergency_contact || '');
    setMedicalAlerts(p.medical_alerts || '');
    setConditionTag(p.medical_condition_tag || 'general');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !emergencyContact.trim()) {
      toast.error('First name, last name and emergency contact are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ndis_id: ndisId.trim() || null,
        address: address.trim() || null,
        emergency_contact: emergencyContact.trim(),
        medical_alerts: medicalAlerts.trim() || null,
        medical_condition_tag: conditionTag,
      };

      const url = editingParticipant
        ? `${BACKEND_URL}/participants/${editingParticipant.id}`
        : `${BACKEND_URL}/participants/`;
      const method = editingParticipant ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || 'Request failed');
      }

      toast.success(editingParticipant ? 'Participant updated.' : 'Participant created.');
      closeModal();
      await fetchParticipants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = participants.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) ||
      (p.ndis_id || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Participants</h1>
          <p className={styles.pageSubtitle}>Manage NDIS participants for your agency</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreateModal}>
          <Plus size={16} /> Add Participant
        </button>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search by name or NDIS ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.centered}><Loader2 size={32} className={styles.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <User size={40} />
          <p>{searchQuery ? 'No participants match your search.' : 'No participants yet. Add your first one.'}</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>NDIS ID</span>
            <span>Address</span>
            <span>Condition</span>
            <span></span>
          </div>
          {filtered.map(p => (
            <div key={p.id} className={styles.tableRow}>
              <span className={styles.participantName}>
                {p.first_name} {p.last_name}
              </span>
              <span className={styles.ndisId}>{p.ndis_id || '—'}</span>
              <span className={styles.address}>
                {p.address ? (
                  <><MapPin size={13} /> {p.address}</>
                ) : (
                  <span className={styles.noAddress}>No address</span>
                )}
              </span>
              <span>
                <span className={`${styles.tag} ${styles[p.medical_condition_tag || 'general']}`}>
                  {TAG_LABELS[p.medical_condition_tag || 'general']}
                </span>
              </span>
              <span className={styles.actions}>
                <button className={styles.btnEdit} onClick={() => openEditModal(p)}>
                  <Pencil size={14} /> Edit
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingParticipant ? 'Edit Participant' : 'Add Participant'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.formGroup}>
                <span>First Name <span className={styles.required}>*</span></span>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John" />
              </label>
              <label className={styles.formGroup}>
                <span>Last Name <span className={styles.required}>*</span></span>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Smith" />
              </label>
              <label className={styles.formGroup}>
                <span>NDIS ID</span>
                <input value={ndisId} onChange={e => setNdisId(e.target.value)} placeholder="e.g. 4307652560" />
              </label>
              <label className={styles.formGroup}>
                <span>Condition Tag</span>
                <select value={conditionTag} onChange={e => setConditionTag(e.target.value as ConditionTag)}>
                  <option value="general">General Care</option>
                  <option value="support">High Support</option>
                  <option value="alert">Medical Alert</option>
                </select>
              </label>
              <label className={`${styles.formGroup} ${styles.fullWidth}`}>
                <span>Address</span>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 123 Main St, Brisbane QLD 4000" />
              </label>
              <label className={`${styles.formGroup} ${styles.fullWidth}`}>
                <span>Emergency Contact <span className={styles.required}>*</span></span>
                <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="Name and phone number" />
              </label>
              <label className={`${styles.formGroup} ${styles.fullWidth}`}>
                <span>Medical Alerts</span>
                <textarea value={medicalAlerts} onChange={e => setMedicalAlerts(e.target.value)} placeholder="Allergies, medications, conditions..." rows={3} />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={closeModal} disabled={isSubmitting}>Cancel</button>
              <button className={styles.btnPrimary} onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className={styles.spinner} /> : null}
                {editingParticipant ? 'Save Changes' : 'Create Participant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
