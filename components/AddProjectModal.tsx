
import React, { useState, useEffect } from 'react';
import { X, Briefcase, Hash, Type, Plus, Clock, CalendarClock, Activity, Edit2 } from 'lucide-react';
import { TaskDefinition, TaskStatus } from '../types';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskDefinition) => void;
  taskToEdit?: TaskDefinition | null;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSave, taskToEdit }) => {
  const [projectCode, setProjectCode] = useState('');
  const [taskName, setTaskName] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('ToDo');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (taskToEdit) {
        // Parse ID and Name from composite string "ID: Name"
        const separatorIndex = taskToEdit.name.indexOf(': ');
        let code = taskToEdit.id;
        let name = taskToEdit.name;
        
        // If the stored name format matches our generator "ID: Name", try to split for display
        if (separatorIndex !== -1 && taskToEdit.name.startsWith(taskToEdit.id)) {
             code = taskToEdit.id;
             name = taskToEdit.name.substring(separatorIndex + 2);
        }

        setProjectCode(code);
        setTaskName(name);
        setEstimatedHours(taskToEdit.estimatedHours ? taskToEdit.estimatedHours.toString() : '');
        setDueDate(taskToEdit.dueDate || '');
        setStatus(taskToEdit.status || 'ToDo');
      } else {
        setProjectCode('');
        setTaskName('');
        setEstimatedHours('');
        setDueDate('');
        setStatus('ToDo');
      }
    }
  }, [isOpen, taskToEdit]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!projectCode.trim()) newErrors.projectCode = "Task ID / Code is required";
    if (!taskName.trim()) newErrors.taskName = "Task Name is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fullId = projectCode.toUpperCase();
    const displayName = `${fullId}: ${taskName}`;
    
    onSave({
      id: fullId,
      name: displayName,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      dueDate: dueDate || undefined,
      status: status
    });
    
    if (!taskToEdit) {
       setProjectCode('');
       setTaskName('');
       setEstimatedHours('');
       setDueDate('');
       setStatus('ToDo');
    }
    onClose();
  };

  const getFieldClass = (fieldName: string) => `w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all text-sm font-medium text-slate-700 ${errors[fieldName] ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end md:items-center justify-center backdrop-blur-sm p-0 md:p-4 transition-opacity">
      <div className="bg-white w-full md:w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              {taskToEdit ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Briefcase className="w-5 h-5 text-indigo-600" />}
            </div>
            {taskToEdit ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task ID / Code</label>
            <div className="relative group">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="e.g. PROJ-200"
                readOnly={!!taskToEdit} 
                className={`${getFieldClass('projectCode')} uppercase placeholder:normal-case read-only:opacity-60 read-only:cursor-not-allowed`}
              />
            </div>
            {errors.projectCode && <p className="text-xs text-red-500 mt-1">{errors.projectCode}</p>}
            {taskToEdit && <p className="text-[10px] text-slate-400 mt-1 pl-1">ID cannot be changed once created.</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task Name</label>
            <div className="relative group">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Database Migration"
                className={getFieldClass('taskName')}
              />
            </div>
            {errors.taskName && <p className="text-xs text-red-500 mt-1">{errors.taskName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Est. Hours</label>
                <div className="relative group">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="number" 
                    min="0"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="Optional"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Due Date</label>
                <div className="relative group">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                />
                </div>
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Initial Status</label>
             <div className="relative group">
               <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <select 
                 value={status}
                 onChange={(e) => setStatus(e.target.value as TaskStatus)}
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
               >
                 <option value="ToDo">To Do</option>
                 <option value="InProgress">In Progress</option>
                 <option value="Done">Done</option>
               </select>
             </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:transform active:scale-[0.98] transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20 text-sm flex items-center justify-center gap-2"
            >
              {taskToEdit ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {taskToEdit ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
