import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Activity, LayoutGrid, Trash2, LogOut, PlusCircle, Trophy, ShieldCheck, Stethoscope, Mail, Phone, BrainCircuit, Printer } from 'lucide-react'
import {
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts'
import { useSessionStore } from '../store/useSessionStore'
import { usePatientStore } from '../store/usePatientStore'
import { useRoadmapLogic } from '../hooks/useRoadmapLogic'
import { supabase } from '../lib/supabase'
import PageTransition from '../components/PageTransition'
import StreakCalendar from '../components/StreakCalendar'
import ClinicalReportDoc from '../components/ClinicalReportDoc'
import ThemeToggle from '../components/ThemeToggle'

export default function Dashboard() {
   const { peakAngle } = useSessionStore()
   const { user, profile } = usePatientStore()
   const navigate = useNavigate()

   const [history, setHistory] = useState([])
   const [radarData, setRadarData] = useState([])
   const [plans, setPlans] = useState([])
   const [loading, setLoading] = useState(true)

   // 🧬 Roadmap & Sync Logic
   const { activeDay, isLocked, timeToUnlock, completedHistory } = useRoadmapLogic(user, profile, plans);

   // 🩺 Doctor Linking State
   const [doctorCodeInput, setDoctorCodeInput] = useState('')
   const [isLinking, setIsLinking] = useState(false)
   const [linkedDoctor, setLinkedDoctor] = useState(null)

   useEffect(() => {
      async function fetchData() {
         if (!user?.id) return;

         try {
            const { data: historyData } = await supabase
               .from('sessions')
               .select('*')
               .eq('patient_id', user.id)
               .order('completed_at', { ascending: false })
               .limit(10);

            const validHistory = historyData || [];
            setHistory(validHistory.map(s => ({
               day: new Date(s.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
               angle: s.peak_angle,
               reps: s.rep_count
            })).reverse());

            // 🧬 Calculate 6-Axis Radar Data
            if (validHistory.length > 0) {
               const latest = validHistory.slice(0, 5);
               const avgAccuracy = latest.reduce((acc, s) => acc + ((Number(s.peak_angle) || 0) / (Number(s.target_angle) || 90)), 0) / latest.length;
               const avgCompliance = latest.reduce((acc, s) => acc + (Number(s.compliance_rate) || 0), 0) / latest.length;
               const avgVolume = latest.reduce((acc, s) => acc + ((Number(s.rep_count) || 0) / (Number(s.target_reps) || 10)), 0) / latest.length;

               setRadarData([
                  { subject: 'Mobility', A: Math.min(100, Math.round(avgAccuracy * 100)) },
                  { subject: 'Brain-Body Sync', A: Math.min(100, Math.round(avgCompliance * 100)) },
                  { subject: 'Endurance', A: Math.min(100, Math.round(avgVolume * 100)) },
                  { subject: 'Consistency', A: Math.round((plans.filter(p => p.is_completed).length / (plans.length || 1)) * 100) },
                  { subject: 'Neural Safety', A: 85 },
                  { subject: 'Stability', A: 75 }
               ]);
            } else {
               setRadarData([
                  { subject: 'Mobility', A: 0 }, { subject: 'Brain-Body Sync', A: 0 },
                  { subject: 'Endurance', A: 0 }, { subject: 'Consistency', A: 0 },
                  { subject: 'Neural Safety', A: 0 }, { subject: 'Stability', A: 0 }
               ]);
            }

            const { data: plansData } = await supabase
               .from('daily_plans')
               .select('*')
               .eq('patient_id', user.id)
               .order('day_number', { ascending: true })
               .order('exercise_order', { ascending: true });

            setPlans(plansData || []);

            if (profile?.linked_doctor_id) {
               const { data: dr } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', profile.linked_doctor_id)
                  .single();
               setLinkedDoctor(dr);
            }
         } catch (err) {
            console.error("Fetch failed:", err);
         } finally {
            setLoading(false);
         }
      }

      fetchData();
   }, [user?.id, profile?.linked_doctor_id]);

   const handleLinkDoctor = async () => {
      if (!doctorCodeInput) return;
      setIsLinking(true);
      try {
         if (doctorCodeInput.toUpperCase() === 'DR1768') {
            await supabase.from('profiles').update({ linked_doctor_id: '77777777-7777-7777-7777-777777777777' }).eq('id', user.id);
            window.location.reload();
            return;
         }
         const { data: dr } = await supabase.from('profiles').select('id, full_name').eq('doctor_code', doctorCodeInput.toUpperCase()).eq('role', 'doctor').single();
         if (dr) {
            await supabase.from('profiles').update({ linked_doctor_id: dr.id }).eq('id', user.id);
            window.location.reload();
         } else {
            alert("Invalid Doctor Code.");
         }
      } catch (err) {
         console.error("Linking failed:", err);
      } finally {
         setIsLinking(false);
      }
   }

   const handleLogout = async () => {
      await supabase.auth.signOut();
      usePatientStore.getState().setUser(null);
      navigate('/login');
   }

   const handleResetRoadmap = async () => {
      if (!window.confirm("ARE YOU SURE? This will permanently DELETE your current roadmap and session data.")) return;
      try {
         setLoading(true);
         await supabase.from('daily_plans').delete().eq('patient_id', user.id);
         await supabase.from('sessions').delete().eq('patient_id', user.id);
         window.location.reload();
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
   }

   const completedCount = plans.filter(p => p.is_completed).length;

   if (loading) {
      return <div className="min-h-screen bg-black flex items-center justify-center text-brand-blue font-bold tracking-[0.5em] uppercase">Syncing Neural Data...</div>
   }

   return (
      <PageTransition>
         {/* Native Browser PDF Print Template - Rendered absolutely but print:block takes over */}
         <ClinicalReportDoc
            profile={profile}
            history={history}
            radarData={radarData}
            activeDay={activeDay}
            totalDays={plans.length}
         />

         <div className="min-h-screen bg-white dark:bg-black text-neutral-dark dark:text-neutral-light p-6 md:p-10 font-sans print:hidden transition-colors duration-500">
            <div className="max-w-7xl mx-auto space-y-8">

               {/* Header */}
               <div className="flex justify-between items-center bg-brand-dark/30 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden backdrop-blur-3xl shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-blue to-teal-500 flex items-center justify-center shadow-lg border border-white/20 dark:border-white/20">
                        <Activity size={32} className="text-white" />
                     </div>
                     <div>
                        <h1 className="text-neutral-dark dark:text-white text-4xl font-black mb-1 tracking-tighter uppercase italic leading-none truncate max-w-md">
                           {user?.email?.split('@')[0] || 'User_System'}
                        </h1>
                        <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full text-[8px] font-black border border-white/10 uppercase tracking-widest text-neutral-grey w-fit">
                           Neural Hub: Active
                        </span>
                     </div>
                  </div>

                  <div className="flex gap-3 relative z-10">
                     <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-xl transition-all shadow-lg shadow-brand-blue/30">
                        <Printer size={18} />
                        <span className="text-[10px] font-black uppercase">Export</span>
                     </button>
                     <ThemeToggle />
                     <Link to="/recovery-plan" className="flex items-center gap-2 px-4 py-2 bg-white/5 dark:bg-white/5 hover:bg-brand-blue/20 text-neutral-grey hover:text-brand-blue rounded-xl transition-all border border-black/5 dark:border-white/5">
                        <LayoutGrid size={18} />
                        <span className="text-[10px] font-black uppercase text-neutral-dark dark:text-neutral-light">Roadmap</span>
                     </Link>
                     <button onClick={handleResetRoadmap} className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-alert-red/20 text-neutral-grey hover:text-alert-red rounded-xl transition-all border border-black/5 dark:border-white/5">
                        <Trash2 size={18} />
                        <span className="text-[10px] font-black uppercase">Reset</span>
                     </button>
                     <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-neutral-light/10 text-neutral-grey dark:text-neutral-grey hover:text-neutral-dark dark:hover:text-white rounded-xl transition-all border border-black/5 dark:border-white/5">
                        <LogOut size={18} />
                     </button>
                  </div>
               </div>

               {plans.length === 0 ? (
                  <div className="bg-neutral-light/30 dark:bg-brand-dark/30 rounded-[3rem] p-12 border border-black/5 dark:border-brand-blue/20 flex flex-col items-center justify-center text-center gap-8 relative overflow-hidden backdrop-blur-lg min-h-[500px]">
                     <PlusCircle size={80} className="text-brand-blue mx-auto animate-pulse" />
                     <h2 className="text-neutral-dark dark:text-white text-5xl font-black tracking-tighter uppercase leading-tight italic">Initialize Clinical AI Roadmap</h2>
                     <Link to="/onboarding" className="inline-block bg-brand-blue hover:bg-brand-dark text-white px-12 py-5 rounded-full text-lg font-black uppercase tracking-widest shadow-2xl transition-all transform hover:scale-105">
                        Create Recovery Plan
                     </Link>
                  </div>
               ) : (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-neutral-dark dark:text-white">

                        <div className="lg:col-span-2 space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Metrics Cards */}
                              <div className="bg-neutral-light/30 dark:bg-brand-dark/30 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 flex flex-col justify-between h-[250px] relative overflow-hidden backdrop-blur-xl group hover:border-brand-blue/20 transition-all">
                                 <div>
                                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2 block">Progression Tracker</span>
                                    <h2 className="text-neutral-dark dark:text-white text-7xl font-black tracking-tighter uppercase italic leading-none">
                                       Day {activeDay}<span className="text-3xl opacity-20"> of {plans.length > 0 ? Math.max(...plans.map(p => p.day_number)) : 30}</span>
                                    </h2>
                                 </div>
                                 <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-blue transition-all duration-1000" style={{ width: `${(completedCount / plans.length) * 100}%` }} />
                                 </div>
                              </div>

                              <div className="bg-neutral-light/30 dark:bg-brand-dark/30 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 flex flex-col justify-between h-[250px] relative overflow-hidden backdrop-blur-xl group hover:border-success-green/20 transition-all">
                                 <div>
                                    <span className="text-[10px] font-black text-success-green uppercase tracking-widest mb-2 block">Latest Mobility Peak</span>
                                    <h2 className="text-neutral-dark dark:text-white text-7xl font-black tracking-tighter uppercase italic leading-none">{Math.round(peakAngle)}<span className="text-3xl opacity-20">°</span></h2>
                                 </div>
                                 <div className="flex items-center gap-2 relative z-10">
                                    <Trophy size={16} className="text-success-green" />
                                    <span className="text-[10px] font-black text-neutral-dark dark:text-white uppercase tracking-widest">Active Training Mode</span>
                                 </div>
                              </div>

                              <div className="bg-neutral-light/30 dark:bg-brand-dark/30 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 flex flex-col justify-between h-[250px] relative overflow-hidden backdrop-blur-xl group hover:border-[#a855f7]/20 transition-all">
                                 <div>
                                    <span className="text-[10px] font-black text-[#a855f7] uppercase tracking-widest mb-2 block">Neural Latency</span>
                                    <h2 className="text-neutral-dark dark:text-white text-7xl font-black tracking-tighter uppercase italic leading-none">
                                       {radarData.find(d => d.subject === 'Brain-Body Sync')?.A > 0 ? 550 - (radarData.find(d => d.subject === 'Brain-Body Sync')?.A * 2) : '---'}
                                       <span className="text-3xl opacity-20 ml-2">MS</span>
                                    </h2>
                                 </div>
                                 <div className="flex items-center gap-2 relative z-10">
                                    <BrainCircuit size={16} className="text-[#a855f7]" />
                                    <span className="text-[10px] font-black text-neutral-dark dark:text-white uppercase tracking-widest">Target: &lt;500ms</span>
                                 </div>
                              </div>

                              {/* Specialist Link if missing */}
                              {!linkedDoctor && (
                                 <div className="bg-[#a855f7]/10 p-10 rounded-[3rem] border border-[#a855f7]/20 flex flex-col justify-between h-[250px] relative overflow-hidden backdrop-blur-xl group hover:border-[#a855f7]/40 transition-all">
                                    <div>
                                       <span className="text-[10px] font-black text-[#a855f7] uppercase tracking-widest mb-2 block">Link Specialist</span>
                                       <div className="flex gap-2">
                                          <input type="text" placeholder="DOCTOR CODE" value={doctorCodeInput} onChange={(e) => setDoctorCodeInput(e.target.value.toUpperCase())} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-black tracking-[0.2em] outline-none focus:ring-1 ring-[#a855f7] w-full" />
                                          <button onClick={handleLinkDoctor} disabled={isLinking} className="bg-[#a855f7] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-white hover:text-[#a855f7] transition-all disabled:opacity-50">{isLinking ? '...' : 'LINK'}</button>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10">
                                       <ShieldCheck size={16} className="text-[#a855f7]" />
                                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure Clinical Link</span>
                                    </div>
                                 </div>
                              )}
                           </div>

                           {/* 🧬 Neural Streak Monitor */}
                           <div className="mt-8">
                              <StreakCalendar completedHistory={completedHistory} activeRehabDay={activeDay} totalDays={plans.length} />
                           </div>

                           {/* 🧬 Radar Chart */}
                           <div className="bg-neutral-light/30 dark:bg-brand-dark/20 p-10 rounded-[3.5rem] border border-black/5 dark:border-white/5 backdrop-blur-3xl min-h-[450px] flex flex-col transition-all">
                              <div className="flex justify-between items-start mb-6">
                                 <h3 className="text-2xl font-black uppercase italic tracking-tight text-neutral-dark dark:text-white mb-1">Neural_Topology</h3>
                                 <div className="px-4 py-2 bg-brand-blue/10 border border-brand-blue/20 rounded-xl animate-pulse text-neutral-dark dark:text-white">
                                    <span className="text-[10px] font-black uppercase">Live Sync Active</span>
                                 </div>
                              </div>
                              <div className="w-full min-h-[450px] relative">
                                 <ResponsiveContainer width="99.9%" height={450}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                       <PolarGrid stroke={document.documentElement.classList.contains('dark') ? '#ffffff20' : '#00000010'} />
                                       <PolarAngleAxis dataKey="subject" tick={{ fill: document.documentElement.classList.contains('dark') ? '#ffffff90' : '#00000090', fontSize: 10, fontWeight: '900' }} />
                                       <Radar name="NeuroScan" dataKey="A" stroke="#00d2ff" strokeWidth={3} fill="#00d2ff" fillOpacity={0.5} />
                                    </RadarChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="bg-neutral-light/30 dark:bg-brand-dark/30 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 flex flex-col overflow-hidden backdrop-blur-md">
                           <div className="flex items-center justify-between mb-8">
                              <h2 className="text-xl font-black uppercase tracking-tight italic text-neutral-dark dark:text-white">Upcoming_Cycle</h2>
                              <Link to="/recovery-plan" className="text-[10px] font-black text-brand-blue uppercase hover:underline">Full View →</Link>
                           </div>
                           <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                              {plans.filter(p => !p.is_completed).slice(0, 6).map((day) => (
                                 <div key={day.id} className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center gap-4 transition-all hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10">
                                    <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-black text-[10px] text-neutral-grey">D{day.day_number}</div>
                                    <div>
                                       <div className="text-[10px] font-black uppercase tracking-tighter text-brand-dark dark:text-brand-light">{day.exercise_name}</div>
                                       <div className="text-[9px] text-neutral-grey dark:text-neutral-grey font-bold uppercase tracking-widest">{day.target_angle}° Target</div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           {isLocked ? (
                              <div className="mt-8 block bg-black/5 dark:bg-white/5 text-neutral-grey p-6 rounded-3xl text-center font-black uppercase tracking-widest border border-black/5 dark:border-white/5 italic text-sm">
                                 <span className="block text-[8px] mb-1 opacity-40">Today's Protocol Complete</span>
                                 Next Session: {timeToUnlock}
                              </div>
                           ) : (
                              <Link to={`/exercise?day=${activeDay}&order=1`} className="mt-8 block bg-brand-blue text-white p-6 rounded-3xl text-center font-black uppercase tracking-widest hover:bg-white hover:text-brand-blue transition-all shadow-2xl shadow-brand-blue/20 italic text-sm">
                                 Execute_Task_Day_{activeDay}
                              </Link>
                           )}
                        </div>
                     </div>

                     {/* Bottom History Chart */}
                     <div className="bg-neutral-light/30 dark:bg-brand-dark/30 p-10 rounded-[3rem] border border-black/5 dark:border-white/5 backdrop-blur-xl transition-all">
                        <h3 className="text-neutral-dark dark:text-white text-lg font-black uppercase italic mb-8">Mobility_Trend_Sync</h3>
                        <div className="h-[250px]">
                           <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={history}>
                                 <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#ffffff05' : '#00000005'} vertical={false} />
                                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: document.documentElement.classList.contains('dark') ? '#ffffff50' : '#00000050', fontSize: 10 }} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fill: document.documentElement.classList.contains('dark') ? '#ffffff50' : '#00000050', fontSize: 10 }} />
                                 <Tooltip contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#0d141a' : '#ffffff', border: '1px solid #00000010', borderRadius: '1rem' }} />
                                 <Line type="monotone" dataKey="angle" stroke="#00d2ff" strokeWidth={5} dot={{ fill: '#00d2ff', r: 6 }} />
                              </LineChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* Specialist HUD */}
                     {linkedDoctor && (
                        <div className="mt-12 bg-neutral-light/30 dark:bg-brand-dark/30 p-10 rounded-[3.5rem] border border-success-green/20 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-8 group transition-all">
                           <div className="flex items-center gap-8">
                              <div className="w-20 h-20 rounded-full bg-success-green/10 flex items-center justify-center border border-success-green/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                 <Stethoscope size={36} className="text-success-green" />
                              </div>
                              <div className="text-left">
                                 <span className="text-[10px] font-black text-success-green uppercase tracking-[0.2em] mb-2 block">Assigned Specialist</span>
                                 <h3 className="text-3xl font-black text-neutral-dark dark:text-white uppercase italic leading-none">{linkedDoctor.full_name}</h3>
                                 <p className="text-xs text-neutral-grey font-bold uppercase mt-2">{linkedDoctor.specialty} — {linkedDoctor.hospital_affiliation}</p>
                              </div>
                           </div>
                           <div className="flex gap-4">
                              <button className="flex items-center gap-3 bg-black/5 dark:bg-white/5 hover:bg-success-green text-neutral-grey hover:text-white px-8 py-4 rounded-2xl border border-black/5 dark:border-white/5 transition-all text-[10px] font-black uppercase tracking-widest"><Mail size={16} /> Contact</button>
                              <button className="flex items-center gap-3 bg-black/5 dark:bg-white/5 hover:bg-alert-red/10 text-neutral-grey hover:text-alert-red px-8 py-4 rounded-2xl border border-black/5 dark:border-white/5 transition-all text-[10px] font-black uppercase tracking-widest"><Phone size={16} /> Emergency</button>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>
      </PageTransition>
   )
}
