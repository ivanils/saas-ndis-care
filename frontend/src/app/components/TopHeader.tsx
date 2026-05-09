// src/components/TopHeader.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
    const [userName, setUserName] = useState('Jane Doe'); // Default fallback

    useEffect(() => {
        // Fetch actual user profile name from Supabase
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.first_name) {
                setUserName(`${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`);
            }
        };
        fetchUser();
    }, []);

    return (
        <header className={styles.headerContainer}>
            <div className={styles.greetingInfo}>
                <h2 className={styles.welcomeText}>Good morning, {userName}!</h2>
                <p className={styles.dateText}>{currentDate}</p>
            </div>

            <div className={styles.userActions}>
                <button className={styles.notificationBtn}>
                    <Bell size={20} />
                    <span className={styles.notificationBadge} />
                </button>
                <div className={styles.avatarWrapper}>
                    <Image
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=f98866&color=fff`}
                        alt={`${userName}'s avatar`}
                        width={44}
                        height={44}
                        className={styles.avatar}
                    />
                </div>
            </div>
        </header>
    );
}