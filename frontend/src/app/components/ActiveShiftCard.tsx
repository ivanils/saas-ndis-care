// src/components/ActiveShiftCard.tsx
'use client';

import Image from 'next/image';
import { MapPin, PencilLine, FileText } from 'lucide-react';
import styles from './ActiveShiftCard.module.scss';

export default function ActiveShiftCard() {
  return (
    <div className={`card-sunrise ${styles.cardContainer}`}>
      
      {/* Header Info */}
      <div className={styles.header}>
        <div className={styles.profileArea}>
          <Image 
            src="https://ui-avatars.com/api/?name=Arthur+Pendelton&background=FEF3C7&color=B45309" 
            alt="Arthur Pendelton" 
            width={48} 
            height={48} 
            className={styles.avatar}
          />
          <div className={styles.textData}>
            <h4 className={styles.name}>Arthur Pendelton</h4>
            <p className={styles.time}>11:30AM - 1:30PM</p>
          </div>
        </div>
        <span className="badge alert">Medical Alert</span>
      </div>

      {/* Map Area */}
      <div className={styles.mapBox}>
        <div className={styles.mapPin}>
          <MapPin fill="var(--text-dark)" color="white" size={24} />
        </div>
      </div>

      {/* Clock Out Action */}
      <button className={`btn-primary ${styles.clockOutBtn}`}>
        Clock-Out
      </button>
      <p className={styles.gpsVerification}>
        <MapPin size={14} /> GPS Location Verified
      </p>

      {/* Secondary Actions */}
      <div className={styles.secondaryActions}>
        <button className={`btn-secondary ${styles.actionBtn}`}>
          <PencilLine size={16} /> Add Care Note
        </button>
        <button className={`btn-secondary ${styles.actionBtn}`}>
          <FileText size={16} /> Review Care Plan
        </button>
      </div>

    </div>
  );
}