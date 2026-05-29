// src/components/TopHeader.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './TopHeader.module.scss';

export default function TopHeader() {
    const [currentDate] = useState(() => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    });

    const [userName, setUserName] = useState('Jane Doe');
    const [showNotifications, setShowNotifications] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('worker')
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, avatar_url, role')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    if (profile.first_name) setUserName(`${profile.first_name} ${profile.last_name || ''}`);
                    if (profile.role) setUserRole(profile.role);
                    if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
                } else if (user.user_metadata?.first_name) {
                    setUserName(`${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`);
                }
            }
        };
        fetchUser();
    }, []);
    const getSettingsPath = (role: string | null) => {
        switch (role) {
            case 'super_admin':
                return '/superadmin/settings';
            case 'admin':
                return '/admin/settings';
            case 'worker':
            default:
                return '/settings';
        }
    };
    return (
        <header className={styles.headerContainer}>
            <div className={styles.greetingInfo}>
                <h2 className={styles.welcomeText}>Good morning, {userName}!</h2>
                <p className={styles.dateText}>{currentDate}</p>
            </div>

            <div className={styles.userActions}>
                <div style={{ position: 'relative' }}>
                    <button
                        className={styles.notificationBtn}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        <span className={styles.notificationBadge} />
                    </button>

                    {showNotifications && (
                        <div className={styles.notificationDropdown}>
                            <h4>Notifications</h4>
                            <p>No new notifications right now.</p>
                        </div>
                    )}
                </div>

                <Link href={getSettingsPath(userRole)} className={styles.avatarWrapper} title="Go to Settings">
                    <Image
                        src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=f98866&color=fff`}
                        alt={`${userName}'s avatar`}
                        width={44}
                        height={44}
                        className={styles.avatar}
                        unoptimized
                    />
                </Link>
            </div>
        </header>
    );
}