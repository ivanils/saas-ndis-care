// src/app/(superadmin)/users/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../superadmin.module.scss';

interface GlobalUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  agencies: { name: string } | null; // Joined table data
}

export default function GlobalUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<GlobalUser[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      // Query profiles and join with agencies table to get the agency name
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, email, role,
          agencies (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Strict casting for TypeScript
      const mappedUsers = ((data as unknown as GlobalUser[]) || []).map(u => ({
        ...u,
        agencies: u.agencies ? { name: u.agencies.name } : null
      }));

      setUsers(mappedUsers);

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching global users:', error);
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      await fetchUsers();
    };
    initData();
  }, [fetchUsers]);

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
          <h1>Global Platform Users</h1>
          <p>Directory of all registered workers, admins, and system operators.</p>
        </div>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Contact</th>
                <th>Tenant (Agency)</th>
                <th>System Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} color="var(--text-muted)" />
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      {user.agencies ? (
                        <span style={{ fontWeight: 500 }}>{user.agencies.name}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>System Operator</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[user.role] || styles.active}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button className={styles.actionBtn} onClick={() => toast('User management coming soon.')}>
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
    </div>
  );
}