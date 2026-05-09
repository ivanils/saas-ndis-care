// src/components/PendingActionsCard.tsx
'use client';

import styles from './PendingActionsCard.module.scss';

// Mock data for pending actions
const PENDING_ACTIONS = [
  {
    id: 1,
    title: 'Write Care Note for Alice Green',
    subtitle: '(8:00 AM shift)',
    buttonText: 'Write',
  },
  {
    id: 2,
    title: 'Acknowledge new privacy policy',
    subtitle: '',
    buttonText: 'Review',
  }
];

export default function PendingActionsCard() {
  return (
    <div className={`card-sunrise ${styles.cardContainer}`}>
      <h3 className={styles.cardTitle}>Pending Actions</h3>
      
      <ul className={styles.actionList}>
        {PENDING_ACTIONS.map((action) => (
          <li key={action.id} className={styles.actionItem}>
            
            <div className={styles.actionText}>
              <span className={styles.title}>
                {action.title}
              </span>
              {action.subtitle && (
                <span className={styles.subtitle}> {action.subtitle}</span>
              )}
            </div>

            <button className={`btn-secondary ${styles.actionBtn}`}>
              {action.buttonText}
            </button>
            
          </li>
        ))}
      </ul>
    </div>
  );
}