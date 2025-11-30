
import React, { useState, useMemo, useEffect } from 'react';
import { TimesheetEntry } from '../types';
import { AlertTriangle, Lock, Clock, FileText, User as UserIcon } from 'lucide-react';

interface GanttChartProps {
  entries: TimesheetEntry[];
  allEntries?: TimesheetEntry[];
  startDate: Date;
  daysToShow?: number;
  onTaskClick?: (taskName: string) => void;
  onEntryClick?: (entry: TimesheetEntry) => void;
  onCellClick?: (date: Date, taskName?: string) => void;
}

interface TaskGroup {
  name: string;
  category: string;
  entries: TimesheetEntry[];
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  entries, 
  allEntries = [], 
  startDate, 
  daysToShow = 7, 
  onTaskClick, 
  onEntryClick,
  onCellClick
}) => {
  const [hoveredTooltip, setHoveredTooltip] = useState<{x: number, y: number, entry: TimesheetEntry} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Helper to compare dates (ignore time)
  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

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
  }, {} as Record<string, TaskGroup>);

  const tasks = Object.values(tasksMap) as TaskGroup[];

  // 3. Calculate Daily Totals
  const dailyTotals = days.map(day => {
    const dateStr = day.toISOString().split('T')[0];
    const dStr = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    
    const daysEntries = entries.filter(e => e.date === dStr);
    return daysEntries.reduce((acc, curr) => acc + curr.durationHours, 0);
  });

  // Extract unique users involved in these entries
  const activeUsers = useMemo(() => {
    const userMap = new Map();
    entries.forEach(e => {
      if (!userMap.has(e.userId)) {
        userMap.set(e.userId, { name: e.userName, id: e.userId });
      }
    });
    return Array.from(userMap.values());
  }, [entries]);

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

  // Dynamic Grid Style for variable columns
  const taskColWidth = isMobile ? '140px' : '250px';
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `${taskColWidth} repeat(${daysToShow}, minmax(40px, 1fr))`
  };

  return (
    <>
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
        {/* Fixed Header: Title & User Summary */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
          <h3 className="font-bold text-slate-800">Task Timeline</h3>
          <div className="flex gap-3 text-xs flex-wrap justify-end items-center">
            {activeUsers.map(u => (
               <div key={u.id} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <span className="text-slate-600 font-medium">{u.name}</span>
               </div>
            ))}
            {activeUsers.length === 0 && (
              <span className="text-slate-400 italic">No active users</span>
            )}
          </div>
        </div>
        
        {/* Single Scroll Container for 2D Scrolling */}
        <div className="overflow-auto max-h-[500px] w-full bg-slate-50 scroll-smooth">
          <div className="min-w-max relative">
              
              {/* Header Row - Sticky Top */}
              <div className="bg-slate-50 border-b border-slate-200 sticky top-0 z-30 shadow-sm" style={gridStyle}>
                {/* Frozen Corner Cell */}
                <div className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 sticky left-0 z-40 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  Task
                </div>
                {/* Date Columns */}
                {days.map((day, i) => (
                  <div key={i} className={`p-2 text-center border-l border-slate-100 flex flex-col justify-center ${isToday(day) ? 'bg-amber-50 border-amber-100' : 'bg-slate-50'}`}>
                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-xs font-bold ${isToday(day) ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {day.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task Rows */}
              <div className="divide-y divide-slate-100 bg-white">
                {tasks.length === 0 ? (
                   <div className="p-8 text-center text-slate-400 text-sm italic w-full">No activity recorded for this period.</div>
                ) : (
                  tasks.map((task) => {
                    return (
                      <div key={task.name} className="hover:bg-slate-50/50 transition-colors group" style={gridStyle}>
                        {/* Task Name Column - Sticky Left */}
                        <div className="p-3 flex flex-col justify-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100">
                          <div className="flex items-start justify-between gap-1">
                            <span 
                              onClick={() => onTaskClick?.(task.name)}
                              className={`text-sm font-medium text-slate-700 truncate ${onTaskClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`} 
                              title={task.name}
                            >
                              {task.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 truncate">{task.category}</span>
                        </div>

                        {/* Day Columns */}
                        {days.map((day, i) => {
                          const dayEntries = getEntriesForDay(task.entries, day);
                          return (
                            <div 
                              key={i} 
                              onClick={() => onCellClick && onCellClick(day, task.name)}
                              className={`p-1 border-l border-slate-100 relative min-h-[50px] flex flex-col justify-center ${isToday(day) ? 'bg-amber-50/30' : ''} ${onCellClick ? 'cursor-pointer hover:bg-indigo-50/30' : ''}`}
                            >
                              {dayEntries.map(entry => {
                                // Calculate visual width based on 8h work day, min 15%
                                const widthPercent = Math.min(100, Math.max(15, (entry.durationHours / 8) * 100));
                                const colorClass = getCategoryColor(entry.taskCategory);

                                return (
                                  <div 
                                    key={entry.id}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredTooltip({
                                        x: rect.left + (rect.width / 2),
                                        y: rect.top,
                                        entry
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredTooltip(null)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onEntryClick) {
                                        onEntryClick(entry);
                                      } else if (onTaskClick) {
                                        onTaskClick(entry.taskName);
                                      }
                                    }}
                                    className={`relative z-0 hover:z-20 mb-1 px-1.5 py-1 rounded-md text-[10px] font-medium shadow-sm border-l-4 ${colorClass} cursor-pointer hover:brightness-95 transition-all hover:scale-105 hover:shadow-lg whitespace-nowrap overflow-hidden flex items-center gap-1`}
                                    style={{ width: `${widthPercent}%` }}
                                  >
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
              <div className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-30 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]" style={gridStyle}>
                 {/* Frozen Footer Corner */}
                 <div className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right pr-4 flex items-center justify-end bg-slate-50 sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100">
                   Total Hours
                 </div>
                 {/* Total Cells */}
                 {dailyTotals.map((total, i) => (
                   <div key={i} className={`p-3 text-center border-l border-slate-100 ${isToday(days[i]) ? 'bg-amber-50' : 'bg-slate-50'}`}>
                     <span className={`text-sm font-bold block ${total > 8 ? 'text-indigo-600' : total > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                       {total > 0 ? total.toFixed(1) + 'h' : '-'}
                     </span>
                   </div>
                 ))}
              </div>

          </div>
        </div>
      </div>

      {/* Custom Tooltip Portal */}
      {hoveredTooltip && (
        <div 
          className="fixed z-[100] bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none transform -translate-x-1/2 -translate-y-[calc(100%+8px)] w-64 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
        >
          <div className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/50 inline-block"></span>
            {hoveredTooltip.entry.taskName}
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2 text-indigo-200">
               <UserIcon className="w-3 h-3" />
               <span className="font-medium">{hoveredTooltip.entry.userName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>
                {hoveredTooltip.entry.startTime} - {hoveredTooltip.entry.endTime} ({hoveredTooltip.entry.durationHours}h)
              </span>
            </div>
            {hoveredTooltip.entry.description && (
              <div className="flex items-start gap-2 pt-1 border-t border-slate-700/50 mt-1">
                <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="italic line-clamp-2">{hoveredTooltip.entry.description}</span>
              </div>
            )}
            <div className="text-[10px] uppercase tracking-wide opacity-60 pt-1">
               {hoveredTooltip.entry.taskCategory} • {hoveredTooltip.entry.status}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 bg-slate-800 transform rotate-45"></div>
        </div>
      )}
    </>
  );
};

export default GanttChart;
