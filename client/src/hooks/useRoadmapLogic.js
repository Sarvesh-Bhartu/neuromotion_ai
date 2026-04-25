import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export function useRoadmapLogic(user, profile, plans = []) {
  const [activeDay, setActiveDay] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [timeToUnlock, setTimeToUnlock] = useState('');
  const [sessionsByDay, setSessionsByDay] = useState({});
  const [loading, setLoading] = useState(true);

  // 🧬 Calculate the Current Progress
  useEffect(() => {
    if (!user || !plans.length || !profile?.recovery_started_at) return;

    const calculateSync = async () => {
      try {
        // 1. Calculate Days Since Onboarding (Started_At)
        const startedAt = new Date(profile.recovery_started_at);
        const now = new Date();
        const diffTime = Math.max(0, now - startedAt);
        const calendarDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 2. Find the earliest "Unfinished" day number
        const unfinished = plans.find(p => !p.is_completed);
        const targetDay = unfinished ? unfinished.day_number : plans[plans.length - 1].day_number;

        // 3. Logic: If current_unfished_day > calendar_day, you are ahead and locked
        // But if you are on Day 1 and you finish it, you can't do Day 2 until calendar_day 2.
        
        let active = targetDay;
        let locked = false;

        // If you finished all tasks for Day X, and Today = Day X, lock Day X+1 until tomorrow
        const finishedAllToday = plans.filter(p => p.day_number === targetDay && !p.is_completed).length === 0;
        
        if (finishedAllToday && targetDay === calendarDay) {
           locked = true;
           active = targetDay; // Show today's finished tasks, or wait
        } else if (targetDay < calendarDay) {
           // You are behind, you can still play your current targetDay
           locked = false;
           active = targetDay;
        }

        setActiveDay(active);
        setIsLocked(locked);

        // 4. Fetch Session History for Streaks
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id, completed_at')
          .eq('patient_id', user.id);

        if (sessionData) {
           const grouped = sessionData.reduce((acc, s) => {
              const dateKey = new Date(s.completed_at).toISOString().split('T')[0];
              if (!acc[dateKey]) acc[dateKey] = true;
              return acc;
           }, {});
           setSessionsByDay(grouped);
        }

      } catch (err) {
        console.error("Roadmap Logic Calculation Error:", err);
      } finally {
        setLoading(false);
      }
    };

    calculateSync();
    
    // Countdown Timer to Midnight for Unlock
    const interval = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeToUnlock(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(interval);

  }, [user, profile?.recovery_started_at, plans, plans.map(p => p.is_completed).join(',')]);

  // 🧬 Streak Logic
  const completedHistory = useMemo(() => {
    // Return a list of ISO dates where ALL tasks for that day's plan were finished
    const fullStreaks = [];
    Object.keys(sessionsByDay).forEach(dateKey => {
       // Find the rehab day associated with this date (usually we can't do multiple)
       // Let's assume they completed all tasks for "a" day number
       // Actually, simplified streak: If they completed ANY session, mark it.
       // Advanced streak: If count(unique tasks) === count(prescribed tasks)
       fullStreaks.push(dateKey); // For now, mark any activity as streak
    });
    return fullStreaks;
  }, [sessionsByDay]);

  return { activeDay, isLocked, timeToUnlock, completedHistory, loading };
}
