// src/app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ color: 'var(--text-dark)', marginBottom: '16px' }}>
        Dashboard
      </h1>
      <div className="card-sunrise">
        <p style={{ color: 'var(--text-muted)' }}>
          Welcome to the authenticated area. The layout structure is working!
        </p>
      </div>
    </div>
  );
}