import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Tag, FileText, Link, CheckSquare, Square, FolderGit2, Edit2 } from 'lucide-react';
import { TimesheetEntry, TaskDefinition } from '../types';

interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<TimesheetEntry, 'id' | 'userId' | 'userName' | 'status'>) => void;
  initialDate?: string;
  availableTasks?: TimesheetEntry[]; // For selecting dependencies
  taskOptions: TaskDefinition[]; // Dropdown options
  entryToEdit?: TimesheetEntry | null;
}

const LogTimeModal: React.FC<LogTimeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialDate, 
  availableTasks = [], 
  taskOptions,
  entryToEdit 
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState('Development');
  const [description, setDescription] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (entryToEdit) {
        // Edit Mode: Populate fields from existing entry
        setDate(entryToEdit.date);
        setStartTime(entryToEdit.startTime);
        setEndTime(entryToEdit.endTime);
        setTaskName(entryToEdit.taskName);
        setCategory(entryToEdit.taskCategory);
        setDescription(entryToEdit.description);
        setSelectedDependencies(entryToEdit.dependencies || []);
      } else {
        // Create Mode: Reset to defaults
        setDate(initialDate || new Date().toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('17:00');
        setDescription('');
        setSelectedDependencies([]);
        setCategory('Development');
        
        // Default to first task if options exist
        if (taskOptions.length > 0) {
          setTaskName(taskOptions[0].name);
        }
      }
    }
  }, [isOpen, entryToEdit, initialDate, taskOptions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate duration
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    
    if (diff < 0) {
       diff = 0; 
    }
    
    onSave({
      date,
      startTime,
      endTime,
      durationHours: diff,
      taskName,
      taskCategory: category,
      description,
      dependencies: selectedDependencies
    });
    
    // Clean up is handled by parent closing, or we can clear here if needed, 
    // but useEffect handles reset on next open.
    onClose();
  };

  const toggleDependency = (id: string) => {
    setSelectedDependencies(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  // Filter available tasks to show only recent ones (e.g., last 14 days)
  const recentTasks = availableTasks
    .filter(t => {
      // Don't let a task depend on itself if editing
      if (entryToEdit && t.id === entryToEdit.id) return false;
      
      const taskDate = new Date(t.date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - taskDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays <= 14; 
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              {entryToEdit ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Clock className="w-5 h-5 text-indigo-600" />}
            </div>
            {entryToEdit ? 'Edit Time Entry' : 'Log Work Time'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex-1">
          <form id="logTimeForm" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Time</label>
                <input 
                  type="time" 
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Time</label>
                <input 
                  type="time" 
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Task Name Select */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task ID / Name</label>
              <div className="relative group">
                <FolderGit2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <select 
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
                >
                  {taskOptions.map(task => (
                    <option key={task.id} value={task.name}>{task.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task Category</label>
              <div className="relative group">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
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

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
              <div className="relative group">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <textarea 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What details did you complete?"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-700 h-24 resize-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Dependencies */}
            {recentTasks.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Link className="w-3 h-3" />
                  Dependencies (Blockers)
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-32 overflow-y-auto bg-slate-50">
                  {recentTasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => toggleDependency(task.id)}
                      className="flex items-center p-2.5 hover:bg-white border-b border-slate-100 last:border-0 cursor-pointer transition-colors group"
                    >
                      {selectedDependencies.includes(task.id) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 mr-3 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400 mr-3 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                         <p className={`text-xs font-medium truncate ${selectedDependencies.includes(task.id) ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {task.taskName}
                        </p>
                        <p className={`text-xs truncate ${selectedDependencies.includes(task.id) ? 'text-indigo-700' : 'text-slate-500'}`}>
                          {task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Select previous tasks that this work depends on.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            form="logTimeForm"
            type="submit"
            className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:transform active:scale-[0.98] transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20 text-sm flex items-center justify-center gap-2"
          >
            {entryToEdit ? <Edit2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {entryToEdit ? 'Update Entry' : 'Log Time'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default LogTimeModal;