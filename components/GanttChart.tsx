
import React, { useState, useMemo, useEffect } from 'react';
import { TimesheetEntry, TaskDefinition, TaskStatus } from '../types';
import { AlertTriangle, Lock, Clock, FileText, User as UserIcon, AlertCircle, CalendarX, CalendarCheck, Users, CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface GanttChartProps {
  entries: TimesheetEntry[];
  allEntries?: TimesheetEntry[];
  tasks?: TaskDefinition[];
  startDate: Date;
  daysToShow?: number;
  onTaskClick?: (taskName: string) => void;
  onEntryClick?: (entry: TimesheetEntry) => void;
  onCellClick?: (date: Date, taskName?: string) => void;
  onUserClick?: (userId: string) => void;
}

interface TaskGroup {
  name: string;
  category: string;
  entries: TimesheetEntry[];
  dueDate?: string;
  isOverdue?: boolean;
  status?: TaskStatus;
}

// --- SUB-COMPONENTS FOR MEMOIZATION ---

interface TooltipInfo {
  x: number;
  y: number;
  entry: TimesheetEntry;
  overtimeInfo?: { cumulative: number, limit: number };
  dayUsers?: string[];
}

interface GanttRowProps {
    task: TaskGroup;
    days: Date[];
    gridStyle: React.CSSProperties;
    entryOvertimeInfo: Map<string, { cumulative: number; limit: number }>;
    onTaskClick?: (taskName: string) => void;
    onEntryClick?: (entry: TimesheetEntry) => void;
    onCellClick?: (date: Date, taskName?: string) => void;
    onHover: (info: TooltipInfo | null) => void;
    taskDefinitions: TaskDefinition[];
    allEntries: TimesheetEntry[];
}

// Helper to format decimal hours to "1h 30m" format
const formatDuration = (decimalHours: number) => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
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

const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
};

const renderTaskStatusBadge = (status?: TaskStatus) => {
    switch (status) {
        case 'Done':
            return (
                <div title="Task Status: Done" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Done
                </div>
            );
        case 'InProgress':
            return (
                <div title="Task Status: In Progress" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> In Progress
                </div>
            );
        case 'ToDo':
        default:
            return (
                <div title="Task Status: To Do" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <Circle className="w-2.5 h-2.5" /> To Do
                </div>
            );
    }
};

const GanttTaskRow = React.memo(({ 
    task, 
    days, 
    gridStyle, 
    entryOvertimeInfo, 
    onTaskClick, 
    onEntryClick, 
    onCellClick, 
    onHover,
    taskDefinitions,
    allEntries
}: GanttRowProps) => {

    const limitInfo = useMemo(() => {
        const def = taskDefinitions.find(t => t.name === task.name);
        if (!def || !def.estimatedHours) return null;
        
        // Calculate total logged from all history to show accurate budget usage
        const totalLogged = allEntries
          .filter(e => e.taskName === task.name)
          .reduce((sum, e) => sum + e.durationHours, 0);
          
        return {
          current: totalLogged,
          limit: def.estimatedHours,
          percentage: Math.min(100, (totalLogged / def.estimatedHours) * 100)
        };
    }, [allEntries, task.name, taskDefinitions]);

    const getEntriesForDay = (taskEntries: TimesheetEntry[], date: Date) => {
        const dStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        return taskEntries.filter(e => e.date === dStr);
    };

    return (
        <div className="hover:bg-slate-50/50 transition-colors group" style={gridStyle}>
        {/* Task Name Column - Sticky Left */}
        <div className="p-3 flex flex-col justify-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100">
            <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
                {task.isOverdue && (
                    <div title={`Overdue! Due Date: ${task.dueDate}`} className="flex-shrink-0 animate-pulse">
                        <CalendarX className="w-3.5 h-3.5 text-red-500" />
                    </div>
                )}
                <span 
                onClick={() => onTaskClick?.(task.name)}
                className={`text-sm font-medium truncate ${task.isOverdue ? 'text-red-600' : 'text-slate-700'} ${onTaskClick ? 'cursor-pointer hover:underline' : ''}`} 
                title={task.name}
                >
                {task.name}
                </span>
            </div>
            </div>
            
            <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5 truncate">
                    {/* Render Task Status Badge */}
                    {renderTaskStatusBadge(task.status)}
                    
                    {task.dueDate && (
                        <span className={`text-[9px] px-1 rounded flex items-center gap-0.5 ${task.isOverdue ? 'bg-red-50 text-red-600 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                            {task.isOverdue ? <CalendarX className="w-2 h-2" /> : <CalendarCheck className="w-2 h-2" />}
                            {new Date(task.dueDate).toLocaleDateString('en-GB', {day: 'numeric', month: 'numeric'})}
                        </span>
                    )}
                </div>
                {limitInfo && (
                <span 
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-colors ${
                    limitInfo.percentage >= 100 ? 'bg-red-50 text-red-600 border-red-100' : 
                    limitInfo.percentage > 85 ? 'bg-orange-50 text-orange-600 border-orange-100' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                    title={`Budget Usage: ${formatDuration(limitInfo.current)} used of ${formatDuration(limitInfo.limit)}`}
                >
                    {formatDuration(limitInfo.current)} / {formatDuration(limitInfo.limit)}
                </span>
                )}
            </div>
            {limitInfo && (
            <div className="h-2 w-full bg-slate-100 rounded-full mt-2 overflow-hidden shadow-inner" title={`${limitInfo.percentage.toFixed(1)}% Used`}>
                <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
                    limitInfo.percentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                    limitInfo.percentage > 85 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                    'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    }`} 
                    style={{ width: `${Math.min(limitInfo.percentage, 100)}%` }}
                />
            </div>
            )}
        </div>

        {/* Day Columns */}
        {days.map((day, i) => {
            const dayEntries = getEntriesForDay(task.entries, day);
            const dayUserNames = Array.from(new Set(dayEntries.map(e => e.userName)));

            return (
            <div 
                key={i} 
                onClick={() => onCellClick && onCellClick(day, task.name)}
                className={`p-1 border-l border-slate-100 relative min-h-[50px] flex flex-col justify-center ${isToday(day) ? 'bg-amber-50/30' : ''} ${onCellClick ? 'cursor-pointer hover:bg-indigo-50/30' : ''}`}
            >
                {dayEntries.map(entry => {
                const widthPercent = Math.min(100, Math.max(15, (entry.durationHours / 8) * 100));
                
                const overtimeInfo = entryOvertimeInfo.get(entry.id);
                const isOvertime = !!overtimeInfo;
                const colorClass = isOvertime 
                    ? 'bg-red-500 border-red-600 text-white' 
                    : getCategoryColor(entry.taskCategory);

                return (
                    <div 
                    key={entry.id}
                    onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        onHover({
                            x: rect.left + (rect.width / 2),
                            y: rect.top,
                            entry,
                            overtimeInfo,
                            dayUsers: dayUserNames
                        });
                    }}
                    onMouseLeave={() => onHover(null)}
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
                    {isOvertime && <AlertTriangle className="w-3 h-3 text-white fill-white/20" />}
                    {formatDuration(entry.durationHours)}
                    </div>
                );
                })}
            </div>
            );
        })}
        </div>
    );
});


// --- MAIN COMPONENT ---

const GanttChart: React.FC<GanttChartProps> = ({ 
  entries, 
  allEntries = [], 
  tasks: taskDefinitions = [],
  startDate, 
  daysToShow = 7, 
  onTaskClick, 
  onEntryClick,
  onCellClick,
  onUserClick
}) => {
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipInfo | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 1. Generate array of days for the header
  const days = useMemo(() => Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  }), [startDate, daysToShow]);

  // 2. Group entries by Task Name
  const tasks = useMemo(() => {
      const tasksMap = entries.reduce((acc, entry) => {
        if (!acc[entry.taskName]) {
          const taskDef = taskDefinitions.find(t => t.name === entry.taskName);
          
          let isOverdue = false;
          if (taskDef?.dueDate) {
            const due = new Date(taskDef.dueDate);
            due.setHours(23, 59, 59, 999);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            isOverdue = due < today;
          }
    
          acc[entry.taskName] = {
            name: entry.taskName,
            category: entry.taskCategory,
            entries: [],
            dueDate: taskDef?.dueDate,
            isOverdue,
            status: taskDef?.status
          };
        }
        acc[entry.taskName].entries.push(entry);
        return acc;
      }, {} as Record<string, TaskGroup>);
    
      return Object.values(tasksMap);
  }, [entries, taskDefinitions]);

  // 3. Calculate Daily Totals
  const dailyTotals = useMemo(() => days.map(day => {
    const dStr = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    const daysEntries = entries.filter(e => e.date === dStr);
    return daysEntries.reduce((acc, curr) => acc + curr.durationHours, 0);
  }), [days, entries]);

  // Extract unique users
  const activeUsers = useMemo(() => {
    const userMap = new Map();
    entries.forEach(e => {
      if (!userMap.has(e.userId)) {
        userMap.set(e.userId, { name: e.userName, id: e.userId });
      }
    });
    return Array.from(userMap.values());
  }, [entries]);

  // Determine Overtime IDs with details
  const entryOvertimeInfo = useMemo(() => {
    const infoMap = new Map<string, { cumulative: number; limit: number }>();
    const sourceEntries = allEntries.length > 0 ? allEntries : entries;

    if (!taskDefinitions || taskDefinitions.length === 0 || sourceEntries.length === 0) return infoMap;
    
    // Create Task Map for fast lookup
    const taskMap = taskDefinitions.reduce((acc, t) => {
        acc[t.name] = t;
        return acc;
    }, {} as Record<string, TaskDefinition>);

    // Group all entries (history) by Task Name
    const allTasksMap = sourceEntries.reduce((acc, entry) => {
      if (!acc[entry.taskName]) acc[entry.taskName] = [];
      acc[entry.taskName].push(entry);
      return acc;
    }, {} as Record<string, TimesheetEntry[]>);

    Object.keys(allTasksMap).forEach(taskName => {
      const taskDef = taskMap[taskName];
      if (!taskDef || !taskDef.estimatedHours) return;

      const limit = taskDef.estimatedHours;
      // Robust Sort: Date String (YYYY-MM-DD) then Start Time (HH:mm)
      // Allows calculating accumulation in strict chronological order
      const sortedEntries = allTasksMap[taskName].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

      let runningTotal = 0;
      sortedEntries.forEach(entry => {
        runningTotal += entry.durationHours;
        
        // Flag if current accumulated total exceeds limit
        if (runningTotal > limit) {
           infoMap.set(entry.id, {
             cumulative: runningTotal,
             limit: limit
           });
        }
      });
    });

    return infoMap;
  }, [allEntries, entries, taskDefinitions]);

  // Dynamic Grid Style
  const taskColWidth = isMobile ? '140px' : '250px';
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `${taskColWidth} repeat(${daysToShow}, minmax(40px, 1fr))`
  }), [taskColWidth, daysToShow]);

  return (
    <>
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
        {/* Fixed Header: Title & User Summary */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
          <h3 className="font-bold text-slate-800">Task Timeline</h3>
          <div className="flex gap-3 text-xs flex-wrap justify-end items-center">
            {activeUsers.map(u => (
               <div 
                 key={u.id} 
                 onClick={() => onUserClick?.(u.id)}
                 className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${onUserClick ? 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-sm bg-white' : 'bg-slate-50 border-slate-100'}`}
                 title={onUserClick ? `Filter by ${u.name}` : undefined}
               >
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
                  tasks.map((task) => (
                      <GanttTaskRow 
                        key={task.name}
                        task={task}
                        days={days}
                        gridStyle={gridStyle}
                        entryOvertimeInfo={entryOvertimeInfo}
                        onTaskClick={onTaskClick}
                        onEntryClick={onEntryClick}
                        onCellClick={onCellClick}
                        onHover={setHoveredTooltip}
                        taskDefinitions={taskDefinitions}
                        allEntries={allEntries}
                      />
                  ))
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
                       {total > 0 ? formatDuration(total) : '-'}
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
            <span className={`w-2 h-2 rounded-full inline-block ${hoveredTooltip.overtimeInfo ? 'bg-red-500' : 'bg-white/50'}`}></span>
            {hoveredTooltip.entry.taskName}
          </div>
          <div className="space-y-1.5 text-slate-300">
            {hoveredTooltip.overtimeInfo && (
              <div className="flex flex-col gap-1 text-red-300 font-bold bg-red-900/30 p-2 rounded border border-red-500/30">
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Over Budget</span>
                 </div>
                 <div className="text-[10px] opacity-90 font-mono">
                    Logged: {formatDuration(hoveredTooltip.overtimeInfo.cumulative)} / {formatDuration(hoveredTooltip.overtimeInfo.limit)}
                 </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-indigo-200">
               <UserIcon className="w-3 h-3" />
               <span className="font-medium">{hoveredTooltip.entry.userName}</span>
            </div>
            {/* Show other users who worked on this task today */}
            {hoveredTooltip.dayUsers && hoveredTooltip.dayUsers.length > 1 && (
               <div className="flex flex-wrap gap-1 mt-0.5 pl-5 border-l border-slate-700/50">
                  {hoveredTooltip.dayUsers.filter(u => u !== hoveredTooltip.entry.userName).map(u => (
                     <span key={u} className="flex items-center gap-1 text-[9px] bg-slate-700/80 px-1.5 py-0.5 rounded text-slate-400">
                        <Users className="w-2 h-2" /> {u}
                     </span>
                  ))}
               </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>
                {hoveredTooltip.entry.startTime} - {hoveredTooltip.entry.endTime} ({formatDuration(hoveredTooltip.entry.durationHours)})
              </span>
            </div>
            
            {!hoveredTooltip.overtimeInfo && (() => {
                // Only show general budget usage if NOT already showing overtime warning
                const def = taskDefinitions.find(t => t.name === hoveredTooltip.entry.taskName);
                if (def && def.estimatedHours) {
                    const total = allEntries
                    .filter(e => e.taskName === hoveredTooltip.entry.taskName)
                    .reduce((sum, e) => sum + e.durationHours, 0);
                    return (
                        <div className="flex items-center gap-2 text-amber-300 border-t border-slate-700/50 pt-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Task Budget: {formatDuration(total)} / {formatDuration(def.estimatedHours)}</span>
                        </div>
                    );
                }
                return null;
            })()}

            {hoveredTooltip.entry.description && (
              <div className="flex items-start gap-2 pt-1 border-t border-slate-700/50 mt-1">
                <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="italic line-clamp-2">{hoveredTooltip.entry.description}</span>
              </div>
            )}
            <div className="text-[10px] uppercase tracking-wide opacity-60 pt-1">
               {hoveredTooltip.entry.taskCategory}
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
