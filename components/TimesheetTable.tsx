
import React from 'react';
import { TimesheetEntry } from '../types';
import { Clock, CheckCircle2, Circle, AlertTriangle, HelpCircle, Pencil, User as UserIcon } from 'lucide-react';

interface TimesheetTableProps {
  entries: TimesheetEntry[];
  allEntries?: TimesheetEntry[]; // Needed for dependency resolution
  onTaskClick?: (taskName: string) => void;
  onEdit?: (entry: TimesheetEntry) => void;
  showUserColumn?: boolean;
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries, allEntries = [], onTaskClick, onEdit, showUserColumn = false }) => {
  
  const getDependencyDetails = (depId: string) => {
    const parent = allEntries.find(e => e.id === depId);
    if (!parent) return { status: 'missing', name: 'Unknown Task', id: depId };
    return { status: parent.status, name: parent.taskName, id: parent.id };
  };

  // Calculate colSpan dynamically based on visible columns
  const getColSpan = () => {
    let cols = 6; // Date, Project, Desc, Dep, Hours, Status
    if (showUserColumn) cols += 1;
    if (onEdit) cols += 1;
    return cols;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              {showUserColumn && (
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <span>Employee</span>
                  </div>
                </th>
              )}
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project / Task</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dependencies</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Hours</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
              {onEdit && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</th>}
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
                const dependencies = entry.dependencies || [];
                
                // Check for unmet dependencies (Rejected or Missing) to highlight the row
                const hasUnmetDependencies = dependencies.some(depId => {
                  const details = getDependencyDetails(depId);
                  return details.status === 'Rejected' || details.status === 'missing';
                });
                
                return (
                  <tr 
                    key={entry.id} 
                    className={`transition-colors group ${hasUnmetDependencies ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}
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
                    {showUserColumn && (
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                             {entry.userName.charAt(0)}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-sm font-medium text-slate-700">{entry.userName}</span>
                             <span className="text-[10px] text-slate-400">ID: {entry.userId}</span>
                           </div>
                         </div>
                       </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span 
                          onClick={() => onTaskClick && onTaskClick(entry.taskName)}
                          className={`text-sm font-bold text-slate-700 truncate max-w-[180px] ${onTaskClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`} 
                          title={entry.taskName}
                        >
                          {entry.taskName}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium w-fit mt-1 ${
                          entry.taskCategory === 'Development' ? 'bg-blue-100 text-blue-800' :
                          entry.taskCategory === 'Meeting' ? 'bg-purple-100 text-purple-800' :
                          entry.taskCategory === 'Design' ? 'bg-pink-100 text-pink-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.taskCategory}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 relative">
                      <div className="flex flex-col">
                        <p className="text-sm text-slate-600 truncate max-w-xs" title={entry.description}>
                          {entry.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       {dependencies.length > 0 ? (
                         <div className="flex flex-col space-y-1.5">
                           {dependencies.map((depId, idx) => {
                             const details = getDependencyDetails(depId);
                             let icon = <HelpCircle className="w-3 h-3 text-slate-400" />;
                             let colorClass = "bg-slate-100 text-slate-500 border-slate-200";
                             
                             if (details.status === 'Approved') {
                               icon = <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
                               colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                             } else if (details.status === 'Pending') {
                               icon = <Clock className="w-3 h-3 text-amber-500" />;
                               colorClass = "bg-amber-50 text-amber-700 border-amber-100";
                             } else if (details.status === 'Rejected' || details.status === 'missing') {
                               icon = <AlertTriangle className="w-3 h-3 text-red-500" />;
                               colorClass = "bg-red-50 text-red-700 border-red-100";
                             }

                             // Extract Project ID part if possible (e.g. "PROJ-101")
                             const shortName = details.name.split(':')[0] || details.id;

                             return (
                               <div key={idx} className={`flex items-center px-2 py-1 rounded-md border text-xs ${colorClass} w-fit max-w-[160px]`} title={`Dependency: ${details.name}`}>
                                 <span className="mr-1.5 flex-shrink-0">{icon}</span>
                                 <span className="truncate font-medium">{shortName}</span>
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <span className="text-slate-300 text-xs px-2">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-slate-700">{entry.durationHours.toFixed(1)} h</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       {entry.status === 'Approved' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                       ) : (
                          <Circle className="w-5 h-5 text-amber-400 mx-auto" />
                       )}
                    </td>
                    {onEdit && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button 
                          onClick={() => onEdit(entry)}
                          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit Entry"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
