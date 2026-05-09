// src/app/(app)/dashboard/page.tsx
import ScheduleCard from '../../components/ScheduleCard';
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
          
          {/* We'll build this component next */}
          <div className="card-sunrise" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              Active Shift
            </h3>
            <div style={{ 
              marginTop: '20px', 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: 'var(--color-bg)', 
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              Map and Clock-in controls will appear here.
            </div>
          </div>
          
          <div className="card-sunrise">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              Pending Actions
            </h3>
            <ul style={{ marginTop: '16px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Write Care Note for Alice Green
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Write</button>
              </li>
            </ul>
          </div>
          
        </div>

      </div>
    </div>
  );
}