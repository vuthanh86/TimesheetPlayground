
import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar, Tag, FileText, Edit2, MessageSquare, Lock, Timer, AlertCircle } from 'lucide-react';
import { TimesheetEntry, TaskDefinition, User } from '../types';

interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<TimesheetEntry, 'id' | 'userId' | 'userName'>) => string | null;
  initialDate?: string;
  initialTaskName?: string;
  availableTasks?: TimesheetEntry[]; // Kept for interface stability, but unused now
  taskOptions: TaskDefinition[]; // Dropdown options
  entryToEdit?: TimesheetEntry | null;
  currentUser: User | null;
}

// Generate 10-minute interval options (00:00 to 23:50)
const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 10) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Helper for local date string YYYY-MM-DD (Duplicated to avoid circular deps or prop drilling complexity)
const getLocalTodayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const LogTimeModal: React.FC<LogTimeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialDate,
  initialTaskName, 
  taskOptions,
  entryToEdit,
  currentUser
}) => {
  const [date, setDate] = useState(initialDate || getLocalTodayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState('Development');
  const [description, setDescription] = useState('');
  const [managerComment, setManagerComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine if this is a Manager viewing someone else's entry
  const isReadOnly = entryToEdit && currentUser?.role === 'Manager' && entryToEdit.userId !== currentUser.id;

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (entryToEdit) {
        // Edit Mode: Populate fields from existing entry
        setDate(entryToEdit.date);
        setStartTime(entryToEdit.startTime);
        setEndTime(entryToEdit.endTime);
        setTaskName(entryToEdit.taskName);
        setCategory(entryToEdit.taskCategory);
        setDescription(entryToEdit.description);
        setManagerComment(entryToEdit.managerComment || '');
      } else {
        // Create Mode: Reset to defaults
        setDate(initialDate || getLocalTodayStr());
        setStartTime('09:00');
        setEndTime('17:00');
        setDescription('');
        setManagerComment('');
        setCategory('Development');
        
        // Default to provided initialTaskName or first option
        if (initialTaskName) {
           setTaskName(initialTaskName);
        } else if (taskOptions.length > 0) {
          setTaskName(taskOptions[0].name);
        }
      }
    }
  }, [isOpen, entryToEdit, initialDate, initialTaskName, taskOptions]);

  // Merge standard options with current value if it doesn't match (e.g. legacy data 09:05)
  const startTimeOptions = useMemo(() => {
    if (startTime && !TIME_OPTIONS.includes(startTime)) {
        return [...TIME_OPTIONS, startTime].sort();
    }
    return TIME_OPTIONS;
  }, [startTime]);

  const endTimeOptions = useMemo(() => {
    if (endTime && !TIME_OPTIONS.includes(endTime)) {
        return [...TIME_OPTIONS, endTime].sort();
    }
    return TIME_OPTIONS;
  }, [endTime]);

  // Calculate duration automatically based on selected times
  const calculatedDuration = useMemo(() => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60; // hours
    return diff > 0 ? diff : 0;
  }, [startTime, endTime]);


  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = "Date is required";
    if (!taskName) newErrors.taskName = "Please select a task";
    if (!description.trim()) newErrors.description = "Description is required";
    
    // Time Logic
    if (startTime >= endTime) {
       newErrors.endTime = "End time must be after start time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Call parent handler
    const errorMessage = onSave({
      date,
      startTime,
      endTime,
      durationHours: calculatedDuration,
      taskName,
      taskCategory: category,
      description,
      managerComment
    });

    // If parent returns a string, it's a validation error from backend/logic
    if (errorMessage) {
        setErrors(prev => ({ ...prev, global: errorMessage }));
    }
  };

  const isManager = currentUser?.role === 'Manager';
  const getFieldClass = (fieldName: string) => `w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all text-sm font-medium text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed ${errors[fieldName] ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end md:items-center justify-center backdrop-blur-sm p-0 md:p-4 transition-opacity">
      <div className="bg-white w-full h-[90vh] md:h-auto md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              {entryToEdit ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Clock className="w-5 h-5 text-indigo-600" />}
            </div>
            {entryToEdit ? (isReadOnly ? 'Review Time Entry' : 'Edit Time Entry') : 'Log Work Time'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1 bg-white">
          
          {errors.global && (
             <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errors.global}</span>
             </div>
          )}

          {isReadOnly && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2 text-xs text-amber-700">
              <Lock className="w-4 h-4" />
              Viewing employee entry. You can only add comments.
            </div>
          )}
          <form id="logTimeForm" onSubmit={handleSubmit} className="space-y-5 pb-6" noValidate>
            
            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${getFieldClass('date')} pl-10 pr-4`}
                />
              </div>
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>

            {/* Time Range */}
            <div>
                <div className="grid grid-cols-2 gap-4 md:gap-5 mb-2">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Time</label>
                    <div className="relative group">
                    <select
                        disabled={isReadOnly}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={`${getFieldClass('startTime')} appearance-none cursor-pointer`}
                    >
                        {startTimeOptions.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    {/* Custom Arrow for select */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Time</label>
                    <div className="relative group">
                    <select
                        disabled={isReadOnly}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={`${getFieldClass('endTime')} appearance-none cursor-pointer`}
                    >
                        {endTimeOptions.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    </div>
                </div>
                </div>
                {errors.endTime && <p className="text-xs text-red-500 mb-2">{errors.endTime}</p>}
                
                {/* Calculated Duration Display */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${calculatedDuration > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <Timer className={`w-4 h-4 ${calculatedDuration > 0 ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Duration</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className={`text-lg font-bold ${calculatedDuration > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                            {calculatedDuration.toFixed(2)}h
                         </span>
                         {calculatedDuration > 0 && (
                             <span className="text-xs text-indigo-400 font-medium">
                                 ({Math.floor(calculatedDuration)}h {Math.round((calculatedDuration % 1) * 60)}m)
                             </span>
                         )}
                    </div>
                </div>
            </div>

            {/* Task Name Select */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task ID / Name</label>
              <div className="relative group">
                <select 
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  disabled={isReadOnly}
                  className={`${getFieldClass('taskName')} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>Select a Task</option>
                  {taskOptions.map(task => (
                    <option key={task.id} value={task.name}>{task.name}</option>
                  ))}
                </select>
              </div>
              {errors.taskName && <p className="text-xs text-red-500 mt-1">{errors.taskName}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task Category</label>
                <div className="relative group">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isReadOnly}
                    className={`${getFieldClass('category')} pl-10 pr-4 appearance-none cursor-pointer`}
                  >
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Research">Research</option>
                    <option value="Testing">Testing</option>
                    <option value="Documentation">Documentation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
              <div className="relative group">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <textarea 
                  disabled={isReadOnly}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What details did you complete?"
                  className={`${getFieldClass('description')} pl-10 pr-4 h-24 resize-none placeholder:text-slate-400`}
                />
              </div>
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Manager Comment (Only for Managers) */}
            {isManager && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                   <MessageSquare className="w-3 h-3" />
                   Manager Comment (Feedback)
                </label>
                <div className="relative group">
                  <textarea 
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    placeholder="Add feedback for this entry (visible to employee)..."
                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-700 h-20 resize-none placeholder:text-indigo-200"
                  />
                </div>
              </div>
            )}
            
          </form>
        </div>

        {/* Actions */}
        <div className="p-4 md:p-6 pt-2 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white pb-safe-area">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-3 md:py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            form="logTimeForm"
            type="submit"
            className="flex-1 py-3 md:py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:transform active:scale-[0.98] transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20 text-sm flex items-center justify-center gap-2"
          >
            {entryToEdit ? (isReadOnly ? <MessageSquare className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />) : <Clock className="w-4 h-4" />}
            {entryToEdit ? (isReadOnly ? 'Save Comment' : 'Update Entry') : 'Log Time'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default LogTimeModal;
