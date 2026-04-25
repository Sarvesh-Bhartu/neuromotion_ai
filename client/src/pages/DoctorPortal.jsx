import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { linkDoctorToPatient } from '../lib/neo4j'
import { UserCheck, ShieldCheck, Activity, ArrowLeft } from 'lucide-react'
import PageTransition from '../components/PageTransition'

export default function DoctorPortal() {
  const [syncCode, setSyncCode] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [message, setMessage] = useState('')

  const handleSync = async (e) => {
    e.preventDefault()
    if (!syncCode || !doctorName) return;

    setStatus('loading')
    setMessage('Searching for patient...')

    try {
      // 1. Find the patient in Supabase using the Sync Code
      const { data: patientProfile, error: sbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('doctor_sync_code', syncCode.toUpperCase())
        .single()

      if (sbError || !patientProfile) {
        throw new Error("Invalid Sync Code. Patient not found.")
      }

      setMessage(`Found ${patientProfile.full_name}. Establishing Graph Link...`)

      // 2. Create the Relationship in Neo4j AuraDB (The Graph Intelligence Layer)
      await linkDoctorToPatient(
        patientProfile.id,
        patientProfile.full_name,
        doctorName
      )

      setStatus('success')
      setMessage(`Successfully linked to ${patientProfile.full_name}! You now have Graph-level oversight of their recovery.`)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black font-sans text-white p-6 flex flex-col items-center justify-center">
        <Link to="/dashboard" className="absolute top-8 left-8 text-neutral-grey hover:text-white flex items-center gap-2 transition-colors no-underline">
           <ArrowLeft size={20} /> Back to Hub
        </Link>

        <div className="max-w-md w-full bg-brand-dark/40 border border-white/5 p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
           
           <div className="flex justify-center mb-8">
              <div className="p-4 bg-brand-blue/10 rounded-2xl border border-brand-blue/20">
                 <ShieldCheck className="text-brand-blue w-12 h-12" />
              </div>
           </div>

           <div className="text-center mb-10">
              <h1 className="text-3xl font-bold mb-2">Doctor's Graph Portal</h1>
              <p className="text-neutral-grey text-sm">Securely link to your patient's neuro-recovery data using their unique sync code.</p>
           </div>

           {status === 'success' ? (
              <div className="bg-success-green/10 border border-success-green/20 p-6 rounded-2xl text-center animate-fade-in">
                 <div className="flex justify-center mb-4">
                    <UserCheck className="text-success-green w-10 h-10" />
                 </div>
                 <p className="text-success-green font-medium mb-4">{message}</p>
                 <button 
                   onClick={() => setStatus('idle')}
                   className="text-sm text-neutral-grey hover:text-white underline transition-colors"
                 >
                   Link another patient
                 </button>
              </div>
           ) : (
              <form onSubmit={handleSync} className="space-y-6">
                 <div>
                    <label className="block text-xs uppercase tracking-widest text-neutral-grey font-bold mb-2">Doctor Name / ID</label>
                    <input 
                      type="text" 
                      required 
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:ring-2 ring-brand-blue outline-none transition-all placeholder:text-neutral-grey/30"
                      placeholder="Dr. Sarah Mitchell"
                    />
                 </div>

                 <div>
                    <label className="block text-xs uppercase tracking-widest text-neutral-grey font-bold mb-2">Patient Sync Code</label>
                    <input 
                      type="text" 
                      required 
                      value={syncCode}
                      onChange={(e) => setSyncCode(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono text-2xl tracking-widest text-center focus:ring-2 ring-brand-blue outline-none transition-all placeholder:text-neutral-grey/30"
                      placeholder="X7Y2Z9"
                    />
                 </div>

                 <button 
                   type="submit"
                   disabled={status === 'loading'}
                   className="w-full py-5 bg-brand-blue hover:bg-brand-blue/80 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                 >
                    {status === 'loading' ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : <Activity size={20} />}
                    {status === 'loading' ? 'Establishing Link...' : 'Synchronize with Patient'}
                 </button>

                 {status === 'error' && (
                    <p className="text-alert-red text-xs text-center font-medium animate-pulse">{message}</p>
                 )}
              </form>
           )}

           <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] text-neutral-grey uppercase tracking-widest opacity-50">
                 Protected by NeuroMotion AI Intelligence Layer
              </p>
           </div>

        </div>
      </div>
    </PageTransition>
  )
}
