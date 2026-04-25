import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePatientStore } from '../store/usePatientStore'
import { useRoadmapLogic } from '../hooks/useRoadmapLogic'
import PageTransition from '../components/PageTransition'
import { CheckCircle, Lock, LayoutGrid, Clock, ArrowRight, Activity, ArrowLeft, History, ShieldCheck, BrainCircuit, Target } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function RecoveryPlan() {
   const { user, profile } = usePatientStore()
   const [plans, setPlans] = useState([])
   const [loading, setLoading] = useState(true)
   const navigate = useNavigate()

   // 🧬 Roadmap Logic Engine
   const { activeDay, isLocked, timeToUnlock } = useRoadmapLogic(user, profile, plans);

   useEffect(() => {
      async function fetchFullPlan() {
         if (!user?.id) return;

         const { data, error } = await supabase
            .from('daily_plans')
            .select('*')
            .eq('patient_id', user.id)
            .order('day_number', { ascending: true });

         if (!error) setPlans(data || []);
         setLoading(false);
      }
      fetchFullPlan();
   }, [user?.id]);

   if (loading) return <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-brand-blue font-bold uppercase tracking-widest">Compiling Full Roadmap...</div>

   return (
      <PageTransition>
         <div className="min-h-screen bg-white dark:bg-black text-neutral-dark dark:text-neutral-light p-6 md:p-10 font-sans transition-colors duration-500">
            <div className="max-w-7xl mx-auto space-y-8">
               
               {/* Header Tracking Hub */}
               <div className="flex flex-col md:flex-row justify-between items-center bg-neutral-light/30 dark:bg-brand-dark/30 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 relative overflow-hidden backdrop-blur-3xl shadow-2xl">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/10 blur-[100px] rounded-full -mr-48 -mt-48" />
                  <div className="relative z-10 flex items-center gap-8 border-b md:border-b-0 md:border-r border-black/5 dark:border-white/10 pb-6 md:pb-0 md:pr-12 mb-6 md:mb-0">
                     <button onClick={() => navigate('/dashboard')} className="p-4 bg-black/5 dark:bg-white/5 hover:bg-brand-blue/20 rounded-full transition-all border border-black/5 dark:border-white/5 shadow-inner">
                        <ArrowLeft size={24} className="text-brand-blue" />
                     </button>
                      <div>
                         <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] block mb-2 opacity-60">Clinical Roadmap Engine</span>
                         <h1 className="text-4xl md:text-5xl font-black text-neutral-dark dark:text-white tracking-tighter uppercase italic leading-none">
                            Day {activeDay} of {plans.length > 0 ? Math.max(...plans.map(p => p.day_number)) : 30}
                         </h1>
                      </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 md:px-12 relative z-10">
                     <div>
                        <span className="block text-[10px] font-black text-neutral-grey uppercase tracking-widest mb-1 opacity-50">Current Goal</span>
                        <span className="text-xl font-black text-neutral-dark dark:text-white uppercase italic">{plans.find(p => p.day_number === activeDay)?.exercise_name || 'Rest Day Protocol'}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-black text-neutral-grey uppercase tracking-widest mb-1 opacity-50">Path Progress</span>
                        <span className="text-xl font-black text-neutral-dark dark:text-white italic">{Math.round((plans.filter(p => p.is_completed).length / plans.length) * 100)}% Complete</span>
                     </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-3">
                     <ThemeToggle />
                     <button className="px-6 py-3 bg-brand-blue/10 dark:bg-brand-blue/10 text-brand-blue rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-blue/20 flex items-center gap-2">
                        <Activity size={14} /> LIVE_SYNC
                     </button>
                  </div>
               </div>

               {/* Roadmap Grid Grouped by Day */}
               <div className="space-y-16">
                  {Object.entries(plans.reduce((acc, plan) => {
                     if (!acc[plan.day_number]) acc[plan.day_number] = [];
                     acc[plan.day_number].push(plan);
                     return acc;
                  }, {})).map(([dayNum, dayExercises]) => (
                     <div key={dayNum} className="space-y-6">
                        <div className="flex items-center gap-4">
                           <h2 className="text-2xl font-black text-brand-blue uppercase italic tracking-tighter">Day {dayNum}</h2>
                           <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                           <span className="text-[10px] font-black text-neutral-grey uppercase tracking-widest">{dayExercises.length} Tasks</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                           {dayExercises.map((day) => {
                              const isArchived = day.day_number < activeDay;
                              const isSequentialLock = day.day_number > activeDay;
                              const isCurrentActive = day.day_number === activeDay;
                              const isDailyLimitReached = isCurrentActive && isLocked;

                              return (
                               <div key={day.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between h-[230px] group relative shadow-xl ${day.is_completed ? 'bg-success-green/10 border-success-green/20 scale-[0.98]' :
                                    isArchived ? 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 opacity-40 grayscale cursor-not-allowed' :
                                       isSequentialLock ? 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 opacity-60 cursor-not-allowed blur-[0.1px]' :
                                          'bg-neutral-light/30 dark:bg-brand-dark/30 border-black/5 dark:border-brand-blue/20 hover:border-brand-blue/40 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
                                    }`}>
                                    {isSequentialLock && (
                                       <div className="absolute inset-0 flex items-center justify-center z-20">
                                          <Lock size={32} className="text-neutral-dark/20 dark:text-white/20" />
                                       </div>
                                    )}

                                 <div className="flex justify-between items-start w-full relative z-10">
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${day.is_completed ? 'bg-success-green text-white' : 'bg-black/10 dark:bg-white/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white'
                                          }`}>
                                          {day.is_completed ? <CheckCircle size={22} /> :
                                             isArchived ? <History size={20} /> :
                                                isSequentialLock ? <Lock size={18} /> :
                                                   day.exercise_order}
                                       </div>
                                       <div className="flex flex-col items-end gap-1">
                                          <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${day.intensity_level === 'High' ? 'bg-alert-orange/20 border-alert-orange/40 text-alert-orange' :
                                             day.intensity_level === 'Moderate' ? 'bg-brand-blue/20 border-brand-blue/40 text-brand-blue' : 'bg-black/10 dark:bg-white/10 border-black/5 dark:border-white/10 text-neutral-grey'
                                             }`}>
                                             {day.intensity_level || 'Moderate'}
                                          </span>
                                          {isCurrentActive && !day.is_completed && (
                                             <span className="text-[10px] font-black text-brand-blue uppercase italic tracking-tighter">Current Sync</span>
                                          )}
                                       </div>
                                    </div>

                                    <div className="relative z-10 space-y-4">
                                       <div className="space-y-1">
                                          <h3 className="text-xl font-black text-neutral-dark dark:text-white uppercase italic leading-none">{day.exercise_name}</h3>
                                          <span className="text-[10px] text-neutral-grey font-bold uppercase tracking-widest">{day.body_part} Session</span>
                                       </div>
                                    </div>

                                    {isDailyLimitReached ? (
                                       <div className="w-full py-3 rounded-xl text-[8px] font-black uppercase tracking-widest text-neutral-grey bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center relative z-10">
                                          Cycle Sync Complete
                                       </div>
                                    ) : (
                                       <button
                                          onClick={() => isCurrentActive && !day.is_completed && navigate(`/exercise?day=${day.day_number}&order=${day.exercise_order}`)}
                                          disabled={day.is_completed || isArchived || isSequentialLock}
                                          className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative z-10 ${day.is_completed ? 'bg-black/40 text-success-green border border-success-green/20' :
                                             isArchived || isSequentialLock ? 'hidden' :
                                                'bg-brand-blue text-white hover:bg-white hover:text-brand-blue shadow-xl shadow-brand-blue/20'
                                             }`}>
                                          {day.is_completed ? 'Finished' : 'Initiate Task'}
                                       </button>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  ))}
               </div>

            </div>
         </div>
      </PageTransition>
   )
}
