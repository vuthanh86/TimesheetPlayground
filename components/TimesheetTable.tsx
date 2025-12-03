
import React, { useMemo, useState } from 'react';
import { TimesheetEntry, TaskDefinition } from '../types';
import { Clock, CheckCircle2, Circle, Pencil, User as UserIcon, MessageSquare, Trash2, AlertTriangle, CalendarX, ChevronLeft, ChevronRight, Loader2, PlusCircle, Hourglass } from 'lucide-react';

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
    let cols = 4; // Date, Hours, Project, Status
    if (showUserColumn) cols += 1;
    if (onEdit || onDelete) cols += 1;
    return cols;
  };

  // Compute set of entry IDs that are overtime (exceed task limit chronologically)
  const overtimeEntryIds = useMemo(() => {
    const ids = new Set<string>();
    if (!tasks || tasks.length === 0 || allEntries.length === 0) return ids;

    // Map tasks for quick lookup
    const taskMap = tasks.reduce((acc, t) => {
        acc[t.name] = t;
        return acc;
    }, {} as Record<string, TaskDefinition>);

    // Group entries by task
    const entriesByTask: Record<string, TimesheetEntry[]> = {};
    allEntries.forEach(e => {
        if (!entriesByTask[e.taskName]) entriesByTask[e.taskName] = [];
        entriesByTask[e.taskName].push(e);
    });

    Object.keys(entriesByTask).forEach(taskName => {
        const taskDef = taskMap[taskName];
        if (!taskDef || !taskDef.estimatedHours) return;

        // Sort chronologically
        const sorted = entriesByTask[taskName].sort((a, b) => {
            const dDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dDiff !== 0) return dDiff;
            return a.startTime.localeCompare(b.startTime);
        });

        let sum = 0;
        sorted.forEach(e => {
            const prev = sum;
            sum += e.durationHours;
            // If previous total was already over limit, or this entry pushes it over
            if (prev >= taskDef.estimatedHours! || sum > taskDef.estimatedHours!) {
                ids.add(e.id);
            }
        });
    });
    return ids;
  }, [allEntries, tasks]);

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

  const renderStatusBadge = (status: 'New' | 'InProgress' | 'Done') => {
      switch (status) {
          case 'Done':
              return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Done
                  </span>
              );
          case 'InProgress':
              return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      In Progress
                  </span>
              );
          case 'New':
          default:
              return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <PlusCircle className="w-3.5 h-3.5" />
                      New
                  </span>
              );
      }
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
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-[140px]">Status</th>
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
                const isOvertime = overtimeEntryIds.has(entry.id);
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
                    className="transition-colors group hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-100 rounded-md">
                          <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{entry.date}</p>
                          <p className="text-xs text-slate-500">{entry.startTime} - {entry.endTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${isOvertime ? 'text-red-600' : 'text-slate-700'}`}>{entry.durationHours.toFixed(1)} h</span>
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
                          {isOvertime && (
                            <div title="Overtime: This entry exceeds the task's estimated limit." className="text-red-500 cursor-help">
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
                            <span className="text-[10px] text-slate-400">
                               Est: {taskDef.estimatedHours}h
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       {renderStatusBadge(entry.status)}
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
