
import React, { useState } from 'react';
import { Briefcase, Search, Plus, Edit2, Trash2, PlayCircle, CheckCircle2, Circle, Calendar, Clock } from 'lucide-react';
import { TaskDefinition, TaskStatus } from '../types';

interface TaskManagementProps {
  tasks: TaskDefinition[];
  onAddTask: () => void;
  onEditTask: (task: TaskDefinition) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ 
  tasks, 
  onAddTask, 
  onEditTask, 
  onDeleteTask, 
  onStatusChange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = tasks.filter(task => 
    task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStatusBadge = (status?: TaskStatus) => {
    switch (status) {
        case 'Done':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Done</span>;
        case 'InProgress':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><PlayCircle className="w-3 h-3" /> In Progress</span>;
        default:
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><Circle className="w-3 h-3" /> To Do</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search tasks..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
           />
        </div>
        <button 
          onClick={onAddTask}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Task Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. / Due</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]" title={task.name}>{task.name}</p>
                        <p className="text-xs text-slate-500 font-mono">ID: {task.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.estimatedHours ? `${task.estimatedHours}h` : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.dueDate || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(task.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                        {task.status !== 'ToDo' && (
                            <button 
                                onClick={() => onStatusChange(task.id, 'ToDo')}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Set to To Do"
                            >
                                <Circle className="w-4 h-4" />
                            </button>
                        )}
                        {task.status !== 'InProgress' && (
                            <button 
                                onClick={() => onStatusChange(task.id, 'InProgress')}
                                className="p-1.5 rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                                title="Set to In Progress"
                            >
                                <PlayCircle className="w-4 h-4" />
                            </button>
                        )}
                        {task.status !== 'Done' && (
                            <button 
                                onClick={() => onStatusChange(task.id, 'Done')}
                                className="p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Set to Done"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => onEditTask(task)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteTask(task.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
