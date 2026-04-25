import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePatientStore } from '../store/usePatientStore'
import { generateInitialPlan } from '../lib/planGenerator'
import PageTransition from '../components/PageTransition'
import { clinicalData } from '../lib/clinicalDataset'
import CameraStream from '../components/CameraStream'
import { calculateAngle } from '../hooks/useAngleCalculation'
import { syncProfileToGraph, syncRoadmapToGraph } from '../lib/graphDB'

/**
 * Re-purposed Onboarding as a "Create Recovery Plan" tool.
 */
export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [capturedBaseline, setCapturedBaseline] = useState(null)
  const [currentLiveAngle, setCurrentLiveAngle] = useState(0)

  const user = usePatientStore((state) => state.user)
  const profile = usePatientStore((state) => state.profile)
  const fetchProfile = usePatientStore((state) => state.fetchProfile)
  const navigate = useNavigate()

  // --- Dynamic Data Logic ---
  const ALLOWED_JOINTS = ['Elbow', 'Knee', 'Shoulder', 'Wrist'];
  const uniqueJoints = [...new Set(clinicalData.map(d => d.joint))]
    .filter(j => ALLOWED_JOINTS.includes(j))
    .sort();
  
  const getInjuriesForJoint = (joint) => {
    return [...new Set(clinicalData.filter(d => d.joint === joint).map(d => d.injury_type))].sort();
  }

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Prefer not to say',
    affected_joint: 'Elbow', 
    affected_side: 'right',
    condition_type: 'Frozen Elbow',
    recovery_stage_weeks: 0,
    pain_level_baseline: 1,
    mobility_grade: 2,
    baseline_rom: 0
  })

  const [injuryOptions, setInjuryOptions] = useState(getInjuriesForJoint('Elbow'));

  // Load existing profile data on mount
  useEffect(() => {
    if (profile) {
      const initialJoint = profile.affected_joint || 'Elbow';
      const availableInjuries = getInjuriesForJoint(initialJoint);
      
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        age: profile.age || '',
        gender: profile.gender || 'Prefer not to say',
        affected_joint: initialJoint,
        affected_side: profile.affected_side || 'right',
        condition_type: profile.condition_type || availableInjuries[0] || 'Stiffness'
      }))
      setInjuryOptions(availableInjuries.length > 0 ? availableInjuries : ['Stiffness']);
    }
  }, [profile])


  useEffect(() => {
    if (user === null) {
      const timeout = setTimeout(() => {
         if (!usePatientStore.getState().user) navigate('/login')
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [user, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'affected_joint') {
      const newInjuries = getInjuriesForJoint(value);
      setInjuryOptions(newInjuries);
      setFormData(prev => ({ 
        ...prev, 
        affected_joint: value,
        condition_type: newInjuries[0] || 'Stiffness'
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }

  const handleLandmarks = (landmarks) => {
    if (!isCalibrating) return;

    // Simplified angle check for calibration
    const isLeft = formData.affected_side === 'left';
    const joint = formData.affected_joint.toLowerCase();
    
    let a_idx, b_idx, c_idx;
    if (joint === 'elbow') { 
      a_idx = isLeft ? 11 : 12; b_idx = isLeft ? 13 : 14; c_idx = isLeft ? 15 : 16; 
    } else if (joint === 'knee' || joint === 'hip' || joint === 'back') {
      a_idx = isLeft ? 23 : 24; b_idx = isLeft ? 25 : 26; c_idx = isLeft ? 27 : 28;
    } else {
      a_idx = isLeft ? 11 : 12; b_idx = isLeft ? 13 : 14; c_idx = isLeft ? 15 : 16;
    }

    const angle = calculateAngle(landmarks[a_idx], landmarks[b_idx], landmarks[c_idx]);
    setCurrentLiveAngle(Math.round(angle));
  }

  const captureBaseline = () => {
    setCapturedBaseline(currentLiveAngle);
    setFormData(prev => ({ ...prev, baseline_rom: currentLiveAngle }));
    setIsCalibrating(false);
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const handleCompletePlan = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const profileData = {
        id: user.id,
        full_name: formData.full_name,
        age: parseInt(formData.age),
        gender: formData.gender,
        affected_joint: formData.affected_joint,
        affected_side: formData.affected_side,
        condition_type: formData.condition_type,
        recovery_stage_weeks: parseInt(formData.recovery_stage_weeks),
        pain_level_baseline: parseInt(formData.pain_level_baseline),
        mobility_grade: parseInt(formData.mobility_grade),
        baseline_rom: formData.baseline_rom
      }

      // 1. Save to Supabase
      const { error } = await supabase.from('profiles').upsert(profileData)
      if (error) throw error
      
      // 2. Generate Recovery Multi-Task Roadmap (Supabase)
      const { roadmap } = await generateInitialPlan(user.id, profileData);
      
      // 3. ✨ Sync to Neo4j Knowledge Graph ✨
      await syncProfileToGraph(user.id, profileData);
      await syncRoadmapToGraph(user.id, roadmap);
      
      // 4. Update Local Store and Navigate
      await fetchProfile(user.id);
      navigate('/dashboard')
    } catch (err) {
      console.error("Error generating plan:", err);
      alert("Error initializing roadmap: " + err.message)
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex justify-center items-center p-4 py-12 font-sans overflow-x-hidden">
        <div className="bg-[#0d141a] rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 md:p-14 border border-white/5 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 blur-[80px] rounded-full -mr-32 -mt-32" />

          {/* Progress Bar */}
          <div className="w-full bg-white/5 h-1.5 rounded-full mb-12 overflow-hidden flex gap-2">
             {[1,2,3,4].map(s => (
                <div key={s} className={`flex-1 h-full transition-all duration-500 rounded-full ${step >= s ? 'bg-brand-blue shadow-[0_0_10px_#1a6b8a]' : 'bg-white/10'}`} />
             ))}
          </div>

          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Identity_Check</h1>
              <p className="text-neutral-grey mb-8 font-medium">Verify your biological profile for accurate neural mapping.</p>
              
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Full Name</span>
                  <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} 
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-brand-blue outline-none transition-all" 
                    placeholder="e.g. Ravi Kumar" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Age</span>
                    <input required type="number" name="age" value={formData.age} onChange={handleChange} 
                      className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold" placeholder="Age" min="10" max="99" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Gender</span>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold">
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Physical_Target</h1>
              <p className="text-neutral-grey mb-8 font-medium">Choose the specific joint cluster for rehabilitation.</p>
              
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Target Configuration</span>
                  <div className="grid grid-cols-2 gap-4">
                    <select name="affected_joint" value={formData.affected_joint} onChange={handleChange} className="w-full p-5 bg-[#1a232e] border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs outline-none focus:border-brand-blue transition-all cursor-pointer">
                      {uniqueJoints.map(j => (
                        <option key={j} value={j} className="bg-[#1a232e] text-white p-2">{j} Joint</option>
                      ))}
                    </select>
                    <select name="affected_side" value={formData.affected_side} onChange={handleChange} className="w-full p-5 bg-[#1a232e] border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs outline-none focus:border-brand-blue transition-all cursor-pointer">
                      <option value="left" className="bg-[#1a232e] text-white p-2">Left Cluster</option>
                      <option value="right" className="bg-[#1a232e] text-white p-2">Right Cluster</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Clinical Descriptor</span>
                  <select name="condition_type" value={formData.condition_type} onChange={handleChange} className="w-full p-5 bg-[#1a232e] border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-brand-blue transition-all cursor-pointer">
                    {injuryOptions.map(i => (
                      <option key={i} value={i} className="bg-[#1a232e] text-white p-2">{i}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Neural_Baseline</h1>
              <p className="text-neutral-grey mb-8 font-medium">Initialize resistance and mobility parameters.</p>
              
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Mobility Grade Selection</span>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { v: 1, l: 'Grade I', d: 'Poor ROM' },
                      { v: 2, l: 'Grade II', d: 'Moderate ROM' },
                      { v: 3, l: 'Grade III', d: 'High ROM' }
                    ].map(grade => (
                      <button 
                        key={grade.v}
                        onClick={() => setFormData(p => ({ ...p, mobility_grade: grade.v }))}
                        className={`p-5 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1 ${formData.mobility_grade === grade.v ? 'border-brand-blue bg-brand-blue/10 text-white shadow-[0_0_20px_rgba(26,107,138,0.2)]' : 'border-white/5 bg-white/5 text-neutral-grey opacity-60 hover:border-white/20'}`}
                      >
                         <span className="block font-black uppercase italic text-sm">{grade.l}</span>
                         <span className="block text-[8px] font-bold uppercase opacity-60 tracking-widest leading-tight">{grade.d}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em]">Pain Threshold</span>
                    <span className="text-lg font-black text-alert-orange italic">{formData.pain_level_baseline} / 10</span>
                  </div>
                  <input type="range" name="pain_level_baseline" value={formData.pain_level_baseline} onChange={handleChange} min="1" max="10" className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-alert-orange" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in text-center">
               {!capturedBaseline ? (
                 <div className="flex flex-col items-center">
                    <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Biological_Baseline</h1>
                    <p className="text-neutral-grey max-w-sm mx-auto text-sm font-medium leading-relaxed mb-8 uppercase tracking-widest leading-relaxed">
                      Please perform one full {formData.affected_joint} movement. We need to measure your current neural limit.
                    </p>
                    
                    <div className="w-full max-w-md aspect-video bg-black/40 rounded-[2rem] border border-white/10 overflow-hidden relative mb-8">
                       {isCalibrating ? (
                         <CameraStream onLandmarks={handleLandmarks} />
                       ) : (
                         <div className="absolute inset-0 flex items-center justify-center">
                            <button onClick={() => setIsCalibrating(true)} className="bg-brand-blue text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">
                               <Camera size={16} /> Activate Calibration Cam
                            </button>
                         </div>
                       )}
                       {isCalibrating && (
                         <div className="absolute top-4 right-4 bg-black/80 px-4 py-2 rounded-xl border border-brand-blue z-50">
                           <span className="text-[10px] text-brand-blue font-black uppercase">Live Angle</span>
                           <div className="text-xl font-black text-white">{currentLiveAngle}°</div>
                         </div>
                       )}
                    </div>

                    {isCalibrating && (
                      <button onClick={captureBaseline} className="bg-success-green text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-2xl">Capture Current Reach</button>
                    )}
                 </div>
               ) : (
                 <div className="py-10">
                    <div className="w-28 h-28 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                      <div className="absolute inset-0 bg-brand-blue/20 rounded-full animate-ping" />
                      <Trophy size={48} className="text-brand-blue relative z-10" />
                    </div>
                    <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">Ready_Sync</h1>
                    <p className="text-neutral-grey max-w-sm mx-auto text-sm font-medium leading-relaxed mb-8 opacity-80 uppercase tracking-widest">
                       Baseline recorded at <span className="text-white font-black">{capturedBaseline}°</span>.
                    </p>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-left max-w-sm mx-auto">
                      <h4 className="font-black text-xs text-brand-light uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-success-green rounded-full" /> Clinical Profile Optimized
                      </h4>
                      <p className="text-[10px] text-neutral-grey uppercase font-bold leading-relaxed tracking-wider">
                        Tailored for age {formData.age} {formData.gender}. Exercises adjusted for high-safety starting ROM of {capturedBaseline}°.
                      </p>
                    </div>
                 </div>
               )}
            </div>
          )}

          <div className="flex justify-between mt-14">
            {step > 1 ? (
               <button onClick={handleBack} className="px-8 py-3 text-neutral-grey font-black uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors">Previous</button>
            ) : <div></div>}
            
            {step < 4 ? (
               <button onClick={handleNext} className="bg-brand-blue text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.4em] hover:bg-white hover:text-brand-blue transition-all shadow-xl active:scale-95">Next_Step</button>
            ) : (
               <button 
                 disabled={isGenerating || !capturedBaseline}
                 onClick={handleCompletePlan} 
                 className={`bg-success-green text-black px-12 py-5 rounded-2xl font-black uppercase text-sm tracking-[0.3em] transition-all shadow-2xl active:scale-95 italic ${isGenerating ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-white hover:text-success-green'}`}
               >
                  {isGenerating ? 'Synching Neural Hub...' : 'Compile Roadmap'}
               </button>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
