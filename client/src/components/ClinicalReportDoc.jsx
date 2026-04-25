import React from 'react';
import { Activity, User, Calendar, ShieldCheck } from 'lucide-react';

export default function ClinicalReportDoc({ profile, history, radarData, activeDay, totalDays }) {
  if (!profile) return null;

  const getSystemDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="hidden print:block absolute inset-0 bg-white text-black bg-white z-[9999] min-h-screen p-10 font-sans tracking-tight">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-black pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">RECOVERY PLAN</h1>
          {activeDay && totalDays && (
            <p className="text-sm font-bold uppercase tracking-widest text-brand-blue mt-1 italic">
              Progress: Day {activeDay} of {totalDays}
            </p>
          )}
          {!activeDay && (
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-1">Clinical Telematics Report</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Date Generated</p>
          <p className="text-lg font-black">{getSystemDate()}</p>
        </div>
      </div>

      {/* Patient Meta */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="border border-gray-300 p-6 rounded-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <User size={14} /> Subject Demographics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Full Name</span>
              <span className="block text-lg font-black">{profile.full_name || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Age / Gender</span>
              <span className="block text-lg font-black">{profile.age || 'N/A'} / {profile.gender || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-300 p-6 rounded-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <Activity size={14} /> Clinical Pathway
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Target Joint</span>
              <span className="block text-lg font-black">{profile.affected_side} {profile.affected_joint}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Diagnosis</span>
              <span className="block text-lg font-black">{profile.condition_type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {radarData && radarData.length > 0 && (
         <div className="mb-10">
            <h3 className="text-xl font-black uppercase mb-4 border-b border-gray-200 pb-2">Multi-Axis Mobility Assessment</h3>
            <div className="grid grid-cols-3 gap-4">
               {radarData.map((d, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                     <span className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{d.subject}</span>
                     <span className="block text-3xl font-black text-black">{d.A}%</span>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* Trajectory Table */}
      {history && history.length > 0 && (
         <div className="mb-10">
            <h3 className="text-xl font-black uppercase mb-4 border-b border-gray-200 pb-2">Recent Session Trajectory</h3>
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-100 uppercase text-[10px] tracking-widest text-gray-500 font-bold">
                     <th className="p-3 rounded-tl-lg">Date</th>
                     <th className="p-3">Peak Angle Achieved</th>
                     <th className="p-3 rounded-tr-lg text-right">Rep Volume</th>
                  </tr>
               </thead>
               <tbody>
                  {history.map((h, i) => (
                     <tr key={i} className="border-b border-gray-100">
                        <td className="p-3 text-sm font-bold">{h.day}</td>
                        <td className="p-3 text-sm font-black">{h.angle}°</td>
                        <td className="p-3 text-sm font-bold text-right">{h.reps} reps</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}

      {/* Signature Block */}
      <div className="mt-20 flex justify-between items-end">
         <div className="w-64">
            <div className="border-b border-black mb-2"></div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Clinician Signature</span>
         </div>
         <div className="flex items-center gap-2 text-gray-400">
            <ShieldCheck size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Generated by NeuroMotion Validation Engine</span>
         </div>
      </div>

    </div>
  );
}
