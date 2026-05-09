// src/components/ScheduleCard.tsx
'use client';

import Image from 'next/image';
import styles from './ScheduleCard.module.scss';

const SCHEDULE_DATA = [
  { 
    id: 1, 
    time: '8:00AM - 10:00AM', 
    participant: 'Alice Green', 
    status: 'Completed', 
    avatar: 'https://ui-avatars.com/api/?name=Alice+Green&background=E6F4EA&color=1E8E3E' 
  },
  { 
    id: 2, 
    time: '11:30AM - 1:30PM', 
    participant: 'Arthur Pendelton', 
    status: 'In Progress', 
    avatar: 'https://ui-avatars.com/api/?name=Arthur+Pendelton&background=FEF3C7&color=B45309' 
  },
  { 
    id: 3, 
    time: '3:00PM - 5:00PM', 
    participant: 'Margaret Smith', 
    status: 'Assigned', 
    avatar: 'https://ui-avatars.com/api/?name=Margaret+Smith&background=F1F5F9&color=475569' 
  },
  { 
    id: 4, 
    time: '5:00PM - 7:00PM', 
    participant: 'John Doe', 
    status: 'Alert', 
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=FEE2E2&color=B91C1C' 
  },
  {
    id: 5,
    time: '7:30PM - 9:30PM',
    participant: 'Emily Davis',
    status: 'Cancelled',
    avatar: 'https://ui-avatars.com/api/?name=Emily+Davis&background=f8d7da&color=842029'
  }
];

export default function ScheduleCard() {
  return (
    <div className="card-sunrise">
      <h3 className={styles.cardTitle}>{"Today's Schedule"}</h3>
      
      <div className={styles.timeline}>
        {SCHEDULE_DATA.map((item) => {
          // Format status to match SCSS classes
          const statusClass = item.status.toLowerCase().replace(' ', '-');
          const isActive = statusClass === 'in-progress';

          return (
            <div 
              key={item.id} 
              className={`${styles.timelineItem} ${isActive ? styles.activeRow : ''}`}
            >
              {/* Left side: Time */}
              <div className={styles.timeColumn}>
                {item.time}
              </div>

              {/* Middle: Timeline Dot/Node */}
              <div className={`${styles.dotColumn} ${styles[statusClass]}`}></div>

              {/* Right side: Avatar, Name and Badge */}
              <div className={styles.contentColumn}>
                <div className={styles.participantInfo}>
                  <Image 
                    src={item.avatar} 
                    alt={`${item.participant}'s avatar`} 
                    width={32}
                    height={32}
                    className={styles.avatarMini} 
                  />
                  <span>{item.participant}</span>
                </div>
                
                <span className={`badge ${statusClass}`}>
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}