import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePatientStore } from '../store/usePatientStore'
import PageTransition from '../components/PageTransition'
import { Stethoscope, Building2, ShieldCheck, ArrowRight } from 'lucide-react'

export default function DoctorProfile() {
  const { user } = usePatientStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    specialty: '',
    hospital_affiliation: ''
  })

  const generateDoctorCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const doctorCode = generateDoctorCode()

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: formData.full_name,
      specialty: formData.specialty,
      hospital_affiliation: formData.hospital_affiliation,
      doctor_code: doctorCode,
      role: 'doctor',
      updated_at: new Date()
    })

    if (error) {
      alert("Error creating clinical profile: " + error.message)
    } else {
      navigate('/doctor-dashboard')
    }
    setLoading(false)
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full bg-brand-dark/30 rounded-[3rem] border border-white/10 p-12 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] rounded-full -mr-32 -mt-32" />
          
          <div className="relative z-10 text-center mb-10">
            <div className="w-20 h-20 bg-brand-blue/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-blue/30 shadow-[0_0_30px_rgba(0,210,255,0.2)]">
               <Stethoscope size={40} className="text-brand-blue" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase mb-2">Clinical_Onboarding</h1>
            <p className="text-neutral-grey text-xs font-bold uppercase tracking-widest leading-relaxed">Initialize your specialist credentials for the NeuroMotion Ecosystem</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em] ml-2">Full Legal Name</label>
                <div className="relative group">
                   <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:ring-2 ring-brand-blue outline-none transition-all placeholder:text-white/10 font-medium"
                      placeholder="Dr. Specialist Name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em] ml-2">Specialization Area</label>
                   <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:ring-2 ring-brand-blue outline-none transition-all placeholder:text-white/10 font-medium"
                      placeholder="Neurology / Orthopedic"
                      value={formData.specialty}
                      onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                      required
                   />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-brand-blue tracking-[0.2em] ml-2">Hospital / Clinic</label>
                   <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:ring-2 ring-brand-blue outline-none transition-all placeholder:text-white/10 font-medium"
                      placeholder="NeuroCenter Global"
                      value={formData.hospital_affiliation}
                      onChange={(e) => setFormData({...formData, hospital_affiliation: e.target.value})}
                      required
                   />
                </div>
             </div>

             <div className="p-6 bg-white/5 rounded-3xl border border-white/10 mt-8 flex items-start gap-4">
                <div className="mt-1"><ShieldCheck size={20} className="text-success-green" /></div>
                <p className="text-[10px] text-neutral-grey font-medium leading-relaxed uppercase tracking-tighter">
                   By completing this onboarding, you will generate a unique <span className="text-white font-bold tracking-normal">Neural_Link_Code</span>. 
                   Sharing this code with patients will grant you secure, real-time access to their neuro-muscular recovery benchmarks and risk analysis.
                </p>
             </div>

             <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue hover:bg-white text-white hover:text-brand-dark p-6 rounded-3xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-3 italic group"
             >
                {loading ? 'Finalizing Profile...' : (
                  <>
                    Initialize Clinical Hub <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </>
                )}
             </button>
          </form>
        </div>
      </div>
    </PageTransition>
  )
}
