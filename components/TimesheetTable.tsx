
import React from 'react';
import { TimesheetEntry } from '../types';
import { Clock, CheckCircle2, Circle, Pencil, User as UserIcon, MessageSquare, Trash2 } from 'lucide-react';

interface TimesheetTableProps {
  entries: TimesheetEntry[];
  allEntries?: TimesheetEntry[]; // Kept for interface compatibility
  onTaskClick?: (taskName: string) => void;
  onEdit?: (entry: TimesheetEntry) => void;
  onDelete?: (entry: TimesheetEntry) => void;
  showUserColumn?: boolean;
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ 
  entries, 
  allEntries = [], 
  onTaskClick, 
  onEdit, 
  onDelete,
  showUserColumn = false 
}) => {
  
  // Calculate colSpan dynamically based on visible columns
  const getColSpan = () => {
    let cols = 4; // Date, Hours, Project, Status
    if (showUserColumn) cols += 1;
    if (onEdit || onDelete) cols += 1;
    return cols;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-[100px]">Status</th>
              {(onEdit || onDelete) && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-[110px]">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={getColSpan()} className="px-6 py-8 text-center text-slate-400 italic">
                  No entries found for this period.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
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
                      <span className="text-sm font-bold text-slate-700">{entry.durationHours.toFixed(1)} h</span>
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
                          <span 
                            onClick={() => onTaskClick && onTaskClick(entry.taskName)}
                            className={`text-sm font-bold text-slate-700 truncate max-w-[240px] ${onTaskClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`} 
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       {entry.status === 'Approved' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                       ) : (
                          <Circle className="w-5 h-5 text-amber-400 mx-auto" />
                       )}
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
    </div>
  );
};

export default TimesheetTable;
