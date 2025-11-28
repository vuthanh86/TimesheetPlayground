import React from 'react';
import { TimesheetEntry } from '../types';
import { AlertTriangle, Lock } from 'lucide-react';

interface GanttChartProps {
  entries: TimesheetEntry[];
  allEntries?: TimesheetEntry[];
  startDate: Date;
  daysToShow?: number;
  onTaskClick?: (taskName: string) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ entries, allEntries = [], startDate, daysToShow = 7, onTaskClick }) => {
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
    // This assumes entries are passed with local date strings in their 'date' field
    // We compare with the loop day's date string
    const dStr = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    
    const daysEntries = entries.filter(e => e.date === dStr);
    return daysEntries.reduce((acc, curr) => acc + curr.durationHours, 0);
  });

  // Helper to check if an entry belongs to a specific date
  const getEntriesForDay = (taskEntries: TimesheetEntry[], date: Date) => {
    const dStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    return taskEntries.filter(e => e.date === dStr);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Development': return 'bg-blue-500 border-blue-600 text-blue-50';
      case 'Meeting': return 'bg-purple-500 border-purple-600 text-purple-50';
      case 'Design': return 'bg-pink-500 border-pink-600 text-pink-50';
      case 'Research': return 'bg-amber-500 border-amber-600 text-amber-50';
      case 'Testing': return 'bg-emerald-500 border-emerald-600 text-emerald-50';
      default: return 'bg-slate-500 border-slate-600 text-slate-50';
    }
  };

  // Check if a specific entry has unsatisfied dependencies
  const getEntryDependencyStatus = (entry: TimesheetEntry) => {
      if (!entry.dependencies || entry.dependencies.length === 0) return 'ok';
      const unmet = entry.dependencies.some(depId => {
          const parent = allEntries.find(p => p.id === depId);
          // If parent missing, rejected, or missing, it's a blocker
          return !parent || parent.status === 'Rejected';
      });
      return unmet ? 'blocked' : 'ok';
  };

  // Helper to check dependencies for a whole task group (for the header icon)
  const hasTaskIssues = (taskName: string) => {
    const taskEntries = entries.filter(e => e.taskName === taskName);
    return taskEntries.some(entry => getEntryDependencyStatus(entry) === 'blocked');
  };

  // Dynamic Grid Style for variable columns
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
          <div className="flex items-center gap-1 ml-2">
             <AlertTriangle className="w-3 h-3 text-red-500" />
             <span className="text-slate-500">Blocked</span>
          </div>
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
                  <div className={`text-xs font-bold ${day.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-[10px] ${day.toDateString() === new Date().toDateString() ? 'text-indigo-500 font-bold' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm italic">No activity recorded for this period.</div>
              ) : (
                tasks.map((task) => {
                  const hasIssue = hasTaskIssues(task.name);
                  return (
                    <div key={task.name} className="hover:bg-slate-50/50 transition-colors group" style={gridStyle}>
                      {/* Task Name Column */}
                      <div className="p-3 flex flex-col justify-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100">
                        <div className="flex items-start justify-between gap-1">
                          <span 
                            onClick={() => onTaskClick?.(task.name)}
                            className={`text-sm font-medium text-slate-700 truncate ${onTaskClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`} 
                            title={task.name}
                          >
                            {task.name}
                          </span>
                          {hasIssue && (
                            <div className="p-0.5" title="Task contains blocked entries">
                               <AlertTriangle className="w-3.5 h-3.5 text-red-500 fill-red-50" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{task.category}</span>
                      </div>

                      {/* Day Columns */}
                      {days.map((day, i) => {
                        const dayEntries = getEntriesForDay(task.entries, day);
                        return (
                          <div key={i} className="p-1 border-l border-slate-100 relative min-h-[50px] flex flex-col justify-center">
                            {dayEntries.map(entry => {
                              // Calculate visual width based on 8h work day, min 15%
                              const widthPercent = Math.min(100, Math.max(15, (entry.durationHours / 8) * 100));
                              const isBlocked = getEntryDependencyStatus(entry) === 'blocked';
                              
                              const colorClass = isBlocked 
                                ? 'bg-red-100 border-red-300 text-red-800' 
                                : getCategoryColor(entry.taskCategory);

                              return (
                                <div 
                                  key={entry.id}
                                  onClick={() => onTaskClick?.(entry.taskName)}
                                  className={`mb-1 px-1.5 py-1 rounded-md text-[10px] font-medium shadow-sm border-l-4 ${colorClass} ${onTaskClick ? 'cursor-pointer hover:brightness-95' : 'cursor-default'} transition-all hover:scale-[1.02] whitespace-nowrap overflow-hidden flex items-center gap-1`}
                                  style={{ width: `${widthPercent}%` }}
                                  title={`${entry.startTime} - ${entry.endTime}: ${entry.description} (${entry.durationHours}h)${isBlocked ? ' - BLOCKED BY DEPENDENCY' : ''}`}
                                >
                                  {isBlocked && <Lock className="w-3 h-3 flex-shrink-0" />}
                                  {entry.durationHours}h
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals Row - Sticky Bottom */}
            <div className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]" style={gridStyle}>
               <div className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right pr-4 flex items-center justify-end bg-slate-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100">
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