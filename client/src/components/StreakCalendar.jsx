import { CheckCircle, Circle, Target } from 'lucide-react'

export default function StreakCalendar({ completedHistory = [], activeRehabDay = 1, totalDays = 84 }) {
  // 🧬 Create an array of the last 14 days and next 7 days for a 3-week clinical window
  const today = new Date();
  const calendarDays = [];

  for (let i = -14; i <= 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    calendarDays.push({
      date: d,
      dateStr,
      isCompleted: completedHistory.includes(dateStr),
      isToday: i === 0,
      isFuture: i > 0
    });
  }

  return (
    <div className="bg-neutral-light/30 dark:bg-brand-dark/20 p-8 rounded-[3rem] border border-black/5 dark:border-white/5 backdrop-blur-3xl group hover:border-brand-blue/10 transition-all">
       <div className="flex justify-between items-center mb-8">
          <div>
             <h3 className="text-xl font-black uppercase text-neutral-dark dark:text-white italic tracking-tighter leading-none">Neural_Streak_Monitor</h3>
             <p className="text-[10px] text-neutral-grey font-bold uppercase mt-2 tracking-widest leading-tight">Longitudinal Session Consistency</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-brand-blue/10 border border-brand-blue/20 rounded-xl shrink-0">
             <Target size={16} className="text-brand-blue" />
             <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Streak: {completedHistory.length} Days</span>
          </div>
       </div>

       <div className="grid grid-cols-7 gap-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
             <div key={idx} className="text-[10px] font-black text-neutral-grey/60 text-center uppercase">{day}</div>
          ))}
          {calendarDays.map((day, idx) => (
             <div key={idx} className="flex flex-col items-center gap-2 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border relative ${
                   day.isCompleted 
                   ? 'bg-brand-blue text-white border-brand-blue shadow-[0_0_20px_rgba(0,210,255,0.4)]' 
                   : day.isToday 
                   ? 'bg-black/5 dark:bg-white/10 border-brand-blue/40 text-neutral-dark dark:text-white animate-pulse' 
                   : day.isFuture 
                   ? 'bg-transparent border-black/5 dark:border-white/5 text-neutral-grey opacity-20' 
                   : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-neutral-grey'
                }`}>
                   <span className="text-[10px] font-black">{day.date.getDate()}</span>
                   {day.isCompleted && (
                      <div className="absolute -top-1 -right-1 bg-success-green rounded-full p-0.5 border-2 border-white dark:border-black">
                         <CheckCircle size={8} className="text-white" />
                      </div>
                   )}
                </div>
                {day.isToday && <div className="absolute -bottom-2 w-1 h-1 bg-brand-blue rounded-full" />}
             </div>
          ))}
       </div>

       <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-4">
          <div className="text-center">
             <span className="block text-2xl font-black text-neutral-dark dark:text-white italic">{activeRehabDay}</span>
             <span className="text-[8px] text-neutral-grey font-bold uppercase tracking-widest">Active Day</span>
          </div>
          <div className="text-center">
             <span className="block text-2xl font-black text-neutral-dark dark:text-white italic">{Math.round((completedHistory.length / totalDays) * 100)}%</span>
             <span className="text-[8px] text-neutral-grey font-bold uppercase tracking-widest font-bold">Bio-Compliance</span>
          </div>
          <div className="text-center">
             <span className="block text-2xl font-black text-brand-blue italic">{totalDays - activeRehabDay}</span>
             <span className="text-[8px] text-neutral-grey font-bold uppercase tracking-widest font-bold">Remaining</span>
          </div>
       </div>
    </div>
  );
}
