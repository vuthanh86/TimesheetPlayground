
import React, { useMemo, useState } from 'react';
import { TimesheetEntry, TaskDefinition, TaskStatus } from '../types';
import { Clock, Pencil, User as UserIcon, MessageSquare, Trash2, AlertTriangle, CalendarX, ChevronLeft, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface TimesheetTableProps {
  entries: TimesheetEntry[];
  allEntries?: TimesheetEntry[]; // Kept for interface compatibility
  tasks?: TaskDefinition[];
  onTaskClick?: (taskName: string) => void;
  onEdit?: (entry: TimesheetEntry) => void;
  onDelete?: (entry: TimesheetEntry) => void;
  showUserColumn?: boolean;
}

const ITEMS_PER_PAGE = 10;

// Helper to format decimal hours to "1h 30m" format
const formatDuration = (decimalHours: number) => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const renderStatusBadge = (taskStatus?: TaskStatus) => {
    switch (taskStatus) {
        case 'Done':
            return <div title="Task Done" className="inline-flex"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>;
        case 'InProgress':
            return <div title="In Progress" className="inline-flex"><Loader2 className="w-4 h-4 text-amber-500 animate-spin" /></div>;
        case 'ToDo':
        default:
            return <div title="To Do" className="inline-flex"><Circle className="w-4 h-4 text-slate-400" /></div>;
    }
};

const TimesheetTable: React.FC<TimesheetTableProps> = ({ 
  entries, 
  allEntries = [], 
  tasks,
  onTaskClick, 
  onEdit, 
  onDelete,
  showUserColumn = false 
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when entries change (e.g. filter applied)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [entries.length]);
  
  // Calculate colSpan dynamically based on visible columns
  const getColSpan = () => {
    let cols = 3; // Date, Hours, Project
    if (showUserColumn) cols += 1;
    if (onEdit || onDelete) cols += 1;
    return cols;
  };

  // Compute detailed overtime info for each entry
  // Returns a Map where key is entry.id and value is { cumulative, limit }
  const entryOvertimeInfo = useMemo(() => {
    const infoMap = new Map<string, { cumulative: number; limit: number }>();
    
    // Ensure we have data to work with. If allEntries is empty (e.g. initial load), fallback to entries if available,
    // though allEntries is preferred for accurate cumulative sums.
    const sourceEntries = allEntries.length > 0 ? allEntries : entries;
    
    if (!tasks || tasks.length === 0 || sourceEntries.length === 0) return infoMap;

    // Map tasks for quick lookup
    const taskMap = tasks.reduce((acc, t) => {
        acc[t.name] = t;
        return acc;
    }, {} as Record<string, TaskDefinition>);

    // Group entries by task
    const entriesByTask: Record<string, TimesheetEntry[]> = {};
    sourceEntries.forEach(e => {
        if (!entriesByTask[e.taskName]) entriesByTask[e.taskName] = [];
        entriesByTask[e.taskName].push(e);
    });

    Object.keys(entriesByTask).forEach(taskName => {
        const taskDef = taskMap[taskName];
        if (!taskDef || !taskDef.estimatedHours) return;

        // Sort chronologically (Robust String Sort: Date then Time)
        // This ensures that we accumulate hours in the order they occurred.
        const sorted = entriesByTask[taskName].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });

        let runningTotal = 0;
        sorted.forEach(e => {
            runningTotal += e.durationHours;
            
            // If the running total STRICTLY exceeds the limit, this entry contributes to overtime.
            // Note: If previous entries already exceeded, this one definitely does too.
            if (runningTotal > taskDef.estimatedHours!) {
                infoMap.set(e.id, {
                    cumulative: runningTotal,
                    limit: taskDef.estimatedHours!
                });
            }
        });
    });
    return infoMap;
  }, [allEntries, entries, tasks]);

  // Pagination Logic
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const paginatedEntries = entries.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
      if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
      if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {/* Constrained Width for Date Column */}
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[150px]">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-[100px]">Hours</th>
              {showUserColumn && (
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[200px]">
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <span>Employee</span>
                  </div>
                </th>
              )}
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project / Task</th>
              {(onEdit || onDelete) && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-[110px]">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedEntries.length === 0 ? (
              <tr>
                <td colSpan={getColSpan()} className="px-6 py-8 text-center text-slate-400 italic">
                  No entries found for this period.
                </td>
              </tr>
            ) : (
              paginatedEntries.map((entry) => {
                const taskDef = tasks?.find(t => t.name === entry.taskName);
                
                const overtimeInfo = entryOvertimeInfo.get(entry.id);
                const isOvertime = !!overtimeInfo;

                let isOverdue = false;
                if (taskDef?.dueDate) {
                    const due = new Date(taskDef.dueDate);
                    due.setHours(23,59,59,999);
                    const entryDate = new Date(entry.date);
                    // If entry date is strictly after due date
                    if (entryDate > due) isOverdue = true;
                }

                return (
                  <tr 
                    key={entry.id} 
                    className={`transition-colors group border-l-4 ${isOvertime ? 'bg-red-50 hover:bg-red-100/50 border-red-400' : 'hover:bg-slate-50 border-transparent'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-md ${isOvertime ? 'bg-red-100' : 'bg-slate-100'}`}>
                          <Clock className={`w-4 h-4 ${isOvertime ? 'text-red-500' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isOvertime ? 'text-red-900' : 'text-slate-800'}`}>{entry.date}</p>
                          <p className={`text-xs ${isOvertime ? 'text-red-700' : 'text-slate-500'}`}>{entry.startTime} - {entry.endTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${isOvertime ? 'text-red-600' : 'text-slate-700'}`}>{formatDuration(entry.durationHours)}</span>
                    </td>
                    {showUserColumn && (
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center space-x-3">
                           <div 
                             className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm cursor-help"
                             title={entry.userName}
                           >
                             {entry.userName.charAt(0)}
                           </div>
                           <div className="flex flex-col truncate max-w-[140px]">
                             <span className="text-sm font-medium text-slate-700 truncate">{entry.userName}</span>
                             <span className="text-[10px] text-slate-400">ID: {entry.userId}</span>
                           </div>
                         </div>
                       </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(taskDef?.status)}
                          {isOvertime && (
                            <div 
                              title={`Overtime Warning!\n\nThis entry exceeds the task budget.\nCumulative Logged: ${formatDuration(overtimeInfo!.cumulative)}\nTask Budget: ${formatDuration(overtimeInfo!.limit)}`} 
                              className="text-red-500 cursor-help"
                            >
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                          {isOverdue && (
                             <div title={`Overdue: Logged after due date ${taskDef?.dueDate}`} className="text-red-500 cursor-help">
                                <CalendarX className="w-4 h-4" />
                             </div>
                          )}
                          <span 
                            onClick={() => onTaskClick && onTaskClick(entry.taskName)}
                            className={`text-sm font-bold truncate max-w-[240px] ${isOvertime || isOverdue ? 'text-red-600' : 'text-slate-700'} ${onTaskClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`} 
                            title={entry.taskName}
                          >
                            {entry.taskName}
                          </span>
                          {entry.managerComment && (
                            <div 
                              className="text-amber-500 hover:text-amber-600 cursor-help transition-colors"
                              title={`Manager Comment: ${entry.managerComment}`}
                            >
                              <MessageSquare className="w-4 h-4 fill-amber-50" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium w-fit ${
                            entry.taskCategory === 'Development' ? 'bg-blue-100 text-blue-800' :
                            entry.taskCategory === 'Meeting' ? 'bg-purple-100 text-purple-800' :
                            entry.taskCategory === 'Design' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.taskCategory}
                          </span>
                          {taskDef?.estimatedHours && (
                            <span className={`text-[10px] ${isOvertime ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                               Est: {formatDuration(taskDef.estimatedHours)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {onEdit && (
                            <button 
                              onClick={() => onEdit(entry)}
                              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Edit Entry"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              onClick={() => onDelete(entry)}
                              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
           <span className="text-xs text-slate-500">
             Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, entries.length)}</span> of <span className="font-semibold text-slate-700">{entries.length}</span> entries
           </span>
           <div className="flex items-center gap-2">
             <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
                <ChevronLeft className="w-4 h-4" />
             </button>
             <span className="text-xs font-medium text-slate-600 px-2">
                Page {currentPage} of {totalPages}
             </span>
             <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
                <ChevronRight className="w-4 h-4" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetTable;
