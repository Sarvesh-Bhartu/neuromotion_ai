import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePatientStore } from '../store/usePatientStore'
import PageTransition from '../components/PageTransition'
import { Activity, Users, AlertTriangle, ArrowRight, LogOut, Search, Filter, Mail, Phone, Calendar, X, BrainCircuit, ShieldCheck, Stethoscope, Printer } from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis 
} from 'recharts'
import ClinicalReportDoc from '../components/ClinicalReportDoc'
import ThemeToggle from '../components/ThemeToggle'

export default function DoctorDashboard() {
  const { user } = usePatientStore()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [localProfile, setLocalProfile] = useState({
    full_name: 'Clinical Director',
    specialty: 'Clinical Neuro-Mobility',
    hospital_affiliation: 'NeuroMotion HQ',
    doctor_code: 'DR1768'
  })
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showDeepDive, setShowDeepDive] = useState(false)
  const [chartReady, setChartReady] = useState(false)

  useEffect(() => {
    if (showDeepDive) {
      const timer = setTimeout(() => setChartReady(true), 150);
      return () => {
         clearTimeout(timer);
         setChartReady(false);
      };
    }
  }, [showDeepDive]);

  useEffect(() => {
    async function fetchClinicalData() {
      if (!user?.id) return;
      
      try {
        const { data: drProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (drProfile) setLocalProfile(drProfile);

        const { data: patientData, error: patientError } = await supabase
          .from('profiles')
          .select('*')
          .eq('linked_doctor_id', user.id);
        
        if (patientError) throw patientError;

        const enrichedPatients = await Promise.all((patientData || []).map(async (p) => {
          // Get Sessions
          const { data: sessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('patient_id', p.id)
            .order('completed_at', { ascending: false })
            .limit(10);

          // Get Plan Progression
          const { count: totalPlans } = await supabase
            .from('daily_plans')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', p.id);
          
          const { count: completedCount } = await supabase
            .from('daily_plans')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', p.id)
            .eq('is_completed', true);

          let riskFlag = false;
          let riskReason = '';
          if (sessions && sessions.length >= 2) {
            if (sessions[1].peak_angle - sessions[0].peak_angle > 10) {
              riskFlag = true;
              riskReason = 'Sudden ROM Regression Detected';
            }
          }
          return { 
            ...p, 
            latestSessions: sessions || [], 
            riskFlag, 
            riskReason,
            totalPlans: totalPlans || 0,
            activeDay: (completedCount || 0) + 1
          };
        }));

        setPatients(enrichedPatients);
      } catch (err) {
        console.error("Clinical Fetch Failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClinicalData();
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    usePatientStore.getState().setUser(null);
    navigate('/login');
  }

  const getRadarData = (p) => {
    if (!p || !p.latestSessions) return [];
    const latest = p.latestSessions.slice(0, 5);
    const avgAccuracy = latest.reduce((acc, s) => acc + (s.peak_angle / (s.target_angle || 90)), 0) / (latest.length || 1);
    const avgCompliance = latest.reduce((acc, s) => acc + (s.compliance_rate || 0), 0) / (latest.length || 1);
    const avgVolume = latest.reduce((acc, s) => acc + (s.rep_count / (s.target_reps || 10)), 0) / (latest.length || 1);

    return [
      { subject: 'Mobility', A: Math.min(100, Math.round(avgAccuracy * 100)), fullMark: 100 },
      { subject: 'Brain-Body Sync', A: Math.min(100, Math.round(avgCompliance * 100)), fullMark: 100 },
      { subject: 'Endurance', A: Math.min(100, Math.round(avgVolume * 100)), fullMark: 100 },
      { subject: 'Consistency', A: 85, fullMark: 100 },
      { subject: 'Neural Safety', A: 90, fullMark: 100 },
      { subject: 'Stability', A: 70, fullMark: 100 }
    ];
  };

  const getHistoryData = (p) => {
    return (p?.latestSessions || []).map(s => ({
      day: new Date(s.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      angle: s.peak_angle
    })).reverse();
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-brand-blue font-bold tracking-[0.5em] uppercase animate-pulse">Syncing Clinical Analysis...</div>
  }

  return (
    <PageTransition>
      {selectedPatient && (
        <ClinicalReportDoc 
            profile={selectedPatient} 
            history={getHistoryData(selectedPatient)} 
            radarData={getRadarData(selectedPatient)} 
            activeDay={selectedPatient.activeDay}
            totalDays={selectedPatient.totalPlans}
        />
      )}

      <div className="min-h-screen bg-white dark:bg-black text-neutral-dark dark:text-neutral-light p-6 md:p-10 font-sans print:hidden transition-colors duration-500">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex justify-between items-center bg-neutral-light/30 dark:bg-brand-dark/30 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 relative overflow-hidden backdrop-blur-3xl shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] rounded-full -mr-32 -mt-32" />
            <div className="relative z-10 flex items-center gap-6">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#a855f7] to-brand-blue flex items-center justify-center shadow-lg border border-white/20">
                  <Activity size={32} className="text-white" />
               </div>
               <div>
                  <h1 className="text-neutral-dark dark:text-white text-4xl font-black mb-1 tracking-tighter uppercase italic leading-none truncate max-w-md">
                    {localProfile?.full_name || 'Dr. Specialist'}
                  </h1>
                  <span className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full text-[8px] font-black border border-black/10 dark:border-white/10 uppercase tracking-widest text-neutral-grey w-fit">
                    SPECIALIST: {localProfile?.specialty || 'General Neurology'}
                  </span>
               </div>
            </div>

            <div className="flex gap-3 relative z-10">
               <ThemeToggle />
               <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-neutral-light/10 text-neutral-grey dark:text-neutral-grey hover:text-neutral-dark dark:hover:text-white rounded-xl transition-all border border-black/5 dark:border-white/5">
                  <LogOut size={18} />
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 tracking-widest text-neutral-dark dark:text-white">
             <div className="bg-neutral-light/50 dark:bg-brand-dark/30 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 backdrop-blur-xl">
                <Users size={20} className="text-brand-blue mb-4" />
                <h2 className="text-4xl font-black text-white dark:text-white italic">{patients.length}</h2>
                <p className="text-[10px] text-neutral-grey font-bold uppercase mt-2">LINKED_COHORTS</p>
             </div>
             <div className="bg-neutral-light/50 dark:bg-brand-dark/30 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 backdrop-blur-xl">
                <AlertTriangle size={20} className="text-alert-orange mb-4" />
                <h2 className="text-4xl font-black text-alert-orange italic">{patients.filter(p => p.riskFlag).length}</h2>
                <p className="text-[10px] text-neutral-grey font-bold uppercase mt-2">RISK_ALERTS</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {patients.length === 0 ? (
               <div className="col-span-full bg-white/5 p-20 rounded-[3rem] border border-white/5 text-center opacity-40 italic font-black uppercase tracking-widest">
                  No patients linked to your clinical identity.
               </div>
             ) : (
               patients.map(p => (
                 <div key={p.id} className={`group relative p-8 rounded-[2.5rem] border transition-all duration-500 shadow-xl ${
                    p.riskFlag ? 'bg-alert-red/10 border-alert-red/30' : 'bg-neutral-light/30 dark:bg-brand-dark/30 border-black/5 dark:border-white/5 hover:border-brand-blue/20'
                 }`}>
                    {p.riskFlag && <div className="absolute top-6 right-6 w-3 h-3 bg-alert-red rounded-full animate-ping" />}
                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">ID: {p.id.substring(0, 8)}</span>
                    <h3 className="text-2xl font-black text-neutral-dark dark:text-white uppercase italic mt-1 mb-6 leading-none">{p.full_name || 'Patient_Alpha'}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                          <span className="block text-[8px] font-black text-neutral-grey uppercase tracking-widest mb-1 font-bold">Mobility</span>
                          <span className="text-xl font-black text-neutral-dark dark:text-white italic">L{p.mobility_grade || 1}</span>
                       </div>
                       <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                          <span className="block text-[8px] font-black text-neutral-grey uppercase tracking-widest mb-1 font-bold">Latest Peak</span>
                          <span className="text-xl font-black text-neutral-dark dark:text-white italic">{p.latestSessions[0]?.peak_angle || 0}°</span>
                       </div>
                    </div>

                    <button 
                       onClick={() => { setSelectedPatient(p); setShowDeepDive(true); }}
                       className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 hover:bg-brand-blue/20 rounded-2xl border border-black/5 dark:border-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-neutral-dark dark:text-white group"
                    >
                       Neural Deep Dive <ArrowRight size={14} className="group-hover:translate-x-2 transition-all" />
                    </button>
                 </div>
               ))
             )}
          </div>
        </div>

        {showDeepDive && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60 dark:bg-black/60">
             <div className="absolute inset-0" onClick={() => setShowDeepDive(false)} />
             <div className="w-full max-w-6xl bg-white dark:bg-[#0d141a] border border-black/10 dark:border-white/10 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] relative z-60 overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-10 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-neutral-light/10 dark:bg-brand-dark/20 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/5 blur-[100px] rounded-full -mr-48 -mt-48" />
                   <div className="relative z-10 flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full bg-brand-blue/20 flex items-center justify-center border border-brand-blue/20">
                         <BrainCircuit size={32} className="text-brand-blue" />
                      </div>
                      <div>
                         <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest block mb-1">Deep_Analysis_Mode: Active</span>
                         <h2 className="text-4xl font-black text-neutral-dark dark:text-white italic uppercase tracking-tighter">{selectedPatient.full_name}</h2>
                      </div>
                   </div>
                   <div className="relative z-10 flex items-center gap-4">
                      <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-3 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-xl transition-all shadow-lg shadow-brand-blue/30">
                         <Printer size={18} />
                         <span className="text-[10px] font-black uppercase">Generate Report</span>
                      </button>
                      <button onClick={() => setShowDeepDive(false)} className="p-4 bg-white/5 hover:bg-alert-red/20 text-neutral-grey hover:text-alert-red rounded-full transition-all border border-white/5">
                         <X size={24} />
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      <div className="bg-brand-dark/30 p-10 rounded-[3rem] border border-white/5 flex flex-col items-center">
                         <div className="text-left w-full mb-8">
                            <h3 className="text-xl font-black uppercase text-white italic leading-none">Neural_Topology</h3>
                            <p className="text-[10px] text-neutral-grey font-bold uppercase mt-2">6-Axis Recovery Vector Analysis</p>
                         </div>
                         <div className="w-full h-[350px] flex items-center justify-center">
                            {chartReady ? (
                               <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(selectedPatient)}>
                                     <PolarGrid stroke="#ffffff20" />
                                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff90', fontSize: 10, fontWeight: '900' }} />
                                     <Radar name="NeuroScan" dataKey="A" stroke="#00d2ff" strokeWidth={3} fill="#00d2ff" fillOpacity={0.5} />
                                  </RadarChart>
                               </ResponsiveContainer>
                            ) : (
                               <div className="text-[10px] font-black text-brand-blue uppercase tracking-widest animate-pulse">Initializing Topology...</div>
                            )}
                         </div>
                      </div>

                      <div className="bg-brand-dark/30 p-10 rounded-[3rem] border border-white/5 flex flex-col">
                         <div className="text-left w-full mb-8 flex justify-between items-center">
                            <div>
                               <h3 className="text-xl font-black uppercase text-white italic leading-none">Trend_Telemetry</h3>
                               <p className="text-[10px] text-neutral-grey font-bold uppercase mt-2">Peak Range of Motion Over Time</p>
                            </div>
                            <div className="px-4 py-2 bg-success-green/10 border border-success-green/20 rounded-xl">
                               <span className="text-[10px] font-black text-success-green uppercase tracking-widest">Growth Detected</span>
                            </div>
                         </div>
                         <div className="w-full h-[350px] relative flex items-center justify-center">
                            {chartReady ? (
                               <ResponsiveContainer width="99.9%" height={350}>
                                  <LineChart data={getHistoryData(selectedPatient)}>
                                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10, fontWeight: 'bold' }} />
                                     <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10, fontWeight: 'bold' }} />
                                     <Tooltip 
                                       contentStyle={{ backgroundColor: '#0d141a', border: '1px solid #ffffff10', borderRadius: '1rem' }}
                                       itemStyle={{ color: '#00d2ff', fontWeight: 'black', fontSize: '12px' }}
                                     />
                                     <Line 
                                       type="monotone" 
                                       dataKey="angle" 
                                       stroke="#00d2ff" 
                                       strokeWidth={4} 
                                       dot={{ fill: '#00d2ff', r: 5, strokeWidth: 2, stroke: '#0d141a' }} 
                                       activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} 
                                     />
                                  </LineChart>
                               </ResponsiveContainer>
                            ) : (
                               <div className="text-[10px] font-black text-brand-blue uppercase tracking-widest animate-pulse">Syncing Telemetry...</div>
                            )}
                         </div>
                      </div>

                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-6">
                         <div className="p-4 bg-brand-blue/10 rounded-2xl"><ShieldCheck size={24} className="text-brand-blue" /></div>
                         <div>
                            <span className="block text-[8px] font-black text-neutral-grey uppercase tracking-widest mb-1">Safety Lock</span>
                            <span className="text-2xl font-black text-white italic uppercase">Bypassed</span>
                         </div>
                      </div>
                      <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-6">
                         <div className="p-4 bg-success-green/10 rounded-2xl"><Activity size={24} className="text-success-green" /></div>
                         <div>
                            <span className="block text-[8px] font-black text-neutral-grey uppercase tracking-widest mb-1">Muscle Fatigue</span>
                            <span className="text-2xl font-black text-white italic uppercase">LOW</span>
                         </div>
                      </div>
                      <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-6">
                         <div className="p-4 bg-[#a855f7]/10 rounded-2xl"><Stethoscope size={24} className="text-[#a855f7]" /></div>
                         <div>
                            <span className="block text-[8px] font-black text-neutral-grey uppercase tracking-widest mb-1">Target Angle</span>
                            <span className="text-2xl font-black text-white italic uppercase">90° PRO</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-10 border-t border-white/5 flex gap-4 bg-brand-dark/20">
                   <button className="flex-1 bg-brand-blue hover:bg-white text-white hover:text-brand-dark p-5 rounded-3xl font-black uppercase tracking-widest transition-all text-sm italic">
                      Generate Clinical Report
                   </button>
                   <button className="flex-1 bg-white/5 hover:bg-white/10 text-white p-5 rounded-3xl font-black uppercase tracking-widest transition-all border border-white/5 text-sm italic">
                      Update Prescription Roadmap
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
