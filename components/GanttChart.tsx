
import React from 'react';
import { TimesheetEntry } from '../types';

interface GanttChartProps {
  entries: TimesheetEntry[];
  startDate: Date;
  daysToShow?: number;
  onTaskClick?: (taskName: string) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ entries, startDate, daysToShow = 7, onTaskClick }) => {
  // 1. Generate array of days for the header
  const days = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  // 2. Group entries by Task Name
  const tasksMap = entries.reduce((acc, entry) => {
    if (!acc[entry.taskName]) {
      acc[entry.taskName] = {
        name: entry.taskName,
        category: entry.taskCategory,
        entries: []
      };
    }
    acc[entry.taskName].entries.push(entry);
    return acc;
  }, {} as Record<string, { name: string, category: string, entries: TimesheetEntry[] }>);

  const tasks = Object.values(tasksMap);

  // 3. Calculate Daily Totals
  const dailyTotals = days.map(day => {
    const dateStr = day.toISOString().split('T')[0];
    const daysEntries = entries.filter(e => e.date === dateStr);
    return daysEntries.reduce((acc, curr) => acc + curr.durationHours, 0);
  });

  // Helper to check if an entry belongs to a specific date
  const getEntriesForDay = (taskEntries: TimesheetEntry[], date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return taskEntries.filter(e => e.date === dateStr);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Development': return 'bg-blue-500 border-blue-600';
      case 'Meeting': return 'bg-purple-500 border-purple-600';
      case 'Design': return 'bg-pink-500 border-pink-600';
      case 'Research': return 'bg-amber-500 border-amber-600';
      case 'Testing': return 'bg-emerald-500 border-emerald-600';
      default: return 'bg-slate-500 border-slate-600';
    }
  };

  // Dynamic Grid Style for variable columns
  // First column 250px, then N columns of min 40px
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `250px repeat(${daysToShow}, minmax(40px, 1fr))`
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white relative z-20">
        <h3 className="font-bold text-slate-800">Task Timeline</h3>
        <div className="flex gap-2 text-xs flex-wrap justify-end">
          {['Development', 'Design', 'Meeting'].map(cat => (
             <div key={cat} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getCategoryColor(cat).split(' ')[0]}`}></div>
                <span className="text-slate-500">{cat}</span>
             </div>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Vertical Scroll Container with Max Height */}
          <div className="max-h-[500px] overflow-y-auto">
            
            {/* Header Row - Sticky Top */}
            <div className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm" style={gridStyle}>
              <div className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 sticky left-0 z-20">Task</div>
              {days.map((day, i) => (
                <div key={i} className="p-3 text-center border-l border-slate-100 bg-slate-50">
                  <div className="text-xs font-bold text-slate-700">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-[10px] text-slate-400">{day.getDate()}</div>
                </div>
              ))}
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm italic">No activity recorded for this period.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.name} className="hover:bg-slate-50/50 transition-colors" style={gridStyle}>
                    {/* Task Name Column */}
                    <div className="p-3 flex flex-col justify-center sticky left-0 bg-white hover:bg-slate-50 transition-colors z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <span 
                        onClick={() => onTaskClick?.(task.name)}
                        className={`text-sm font-medium text-slate-700 truncate ${onTaskClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`} 
                        title={task.name}
                      >
                        {task.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{task.category}</span>
                    </div>

                    {/* Day Columns */}
                    {days.map((day, i) => {
                      const dayEntries = getEntriesForDay(task.entries, day);
                      return (
                        <div key={i} className="p-1 border-l border-slate-100 relative min-h-[50px]">
                          {dayEntries.map(entry => (
                            <div 
                              key={entry.id}
                              onClick={() => onTaskClick?.(entry.taskName)}
                              className={`mb-1 px-1.5 py-1 rounded text-[10px] text-white font-medium shadow-sm border-l-2 ${getCategoryColor(entry.taskCategory)} ${onTaskClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} transition-transform hover:scale-[1.02]`}
                              title={`${entry.startTime} - ${entry.endTime}: ${entry.description}`}
                            >
                              <div className="flex justify-between items-center">
                                <span>{entry.durationHours}h</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Totals Row - Sticky Bottom */}
            <div className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]" style={gridStyle}>
               <div className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right pr-4 flex items-center justify-end bg-slate-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                 Total Hours
               </div>
               {dailyTotals.map((total, i) => (
                 <div key={i} className="p-3 text-center border-l border-slate-100 bg-slate-50">
                   <span className={`text-sm font-bold block ${total > 8 ? 'text-indigo-600' : total > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                     {total > 0 ? total.toFixed(1) + 'h' : '-'}
                   </span>
                 </div>
               ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
