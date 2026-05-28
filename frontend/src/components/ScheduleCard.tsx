// src/components/ScheduleCard.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase'; // Asegúrate de que esta ruta es correcta para tu proyecto
import styles from './ScheduleCard.module.scss';

// Definimos la estructura de datos que esperamos de Supabase
interface ShiftData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  participants: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
}

export default function ScheduleCard() {
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayShifts = async () => {
      try {
        // 1. Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Traer los turnos del usuario haciendo JOIN con participantes
        const { data, error } = await supabase
          .from('shifts')
          .select(`
            id,
            start_time,
            end_time,
            status,
            participants (
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('worker_id', user.id)
          .order('start_time', { ascending: true });

        if (error) throw error;
        
        if (data) {
          // Type casting para asegurar que TypeScript entienda la relación
          setShifts(data as unknown as ShiftData[]);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayShifts();
  }, []);

  // Helper para formatear la hora (ej: "8:00 AM")
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper para mostrar el status bonito (ej: 'in_progress' -> 'In Progress')
  const formatStatusDisplay = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="card-sunrise">
      <h3 className={styles.cardTitle}>{"Today's Schedule"}</h3>
      
      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Cargando turnos...</p>
      ) : shifts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No tienes turnos programados para hoy.</p>
      ) : (
        <div className={styles.timeline}>
          {shifts.map((shift) => {
            // CSS classes expectations: 'completed', 'in-progress', etc.
            const statusClass = shift.status.replace('_', '-');
            const isActive = statusClass === 'in-progress';
            
            const participantName = shift.participants 
              ? `${shift.participants.first_name} ${shift.participants.last_name}`
              : 'Unknown Participant';

            const avatarUrl = shift.participants?.avatar_url 
              || `https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=F1F5F9&color=475569`;

            return (
              <div 
                key={shift.id} 
                className={`${styles.timelineItem} ${isActive ? styles.activeRow : ''}`}
              >
                {/* Left side: Time */}
                <div className={styles.timeColumn}>
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </div>

                {/* Middle: Timeline Dot/Node */}
                <div className={`${styles.dotColumn} ${styles[statusClass]}`}></div>

                {/* Right side: Avatar, Name and Badge */}
                <div className={styles.contentColumn}>
                  <div className={styles.participantInfo}>
                    <Image 
                      src={avatarUrl} 
                      alt={`${participantName}'s avatar`} 
                      width={32}
                      height={32}
                      className={styles.avatarMini} 
                    />
                    <span>{participantName}</span>
                  </div>
                  
                  <span className={`badge ${statusClass}`}>
                    {formatStatusDisplay(shift.status)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}