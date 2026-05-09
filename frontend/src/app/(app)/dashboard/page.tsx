// src/app/(app)/dashboard/page.tsx
import ScheduleCard from '../../components/ScheduleCard';
import ActiveShiftCard from '../../components/ActiveShiftCard';
import PendingActionsCard from '../../components/PendingActionsCard';
import styles from './page.module.scss';

export default function DashboardPage() {
  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.mainContent}>
        
        {/* Left Column: Schedule */}
        <div className={styles.column}>
          <ScheduleCard />
        </div>

        {/* Right Column: Active Shift & Actions (Placeholders for now) */}
        <div className={styles.column}>
          <ActiveShiftCard />
          <PendingActionsCard />
          
        </div>

      </div>
    </div>
  );
}