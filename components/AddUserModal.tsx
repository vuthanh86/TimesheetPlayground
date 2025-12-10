
import React, { useState, useEffect } from 'react';
import { X, UserPlus, User, Shield, Type, Edit2 } from 'lucide-react';
import { User as UserType, UserRole } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<UserType, 'id'>) => void;
  userToEdit?: UserType | null;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (userToEdit) {
        setName(userToEdit.name);
        setUsername(userToEdit.username);
        setRole(userToEdit.role);
      } else {
        setName('');
        setUsername('');
        setRole('Employee');
      }
    }
  }, [isOpen, userToEdit]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Full Name is required";
    if (!username.trim()) newErrors.username = "Username is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    onSave({
      name,
      username,
      role
    });
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
              {userToEdit ? (
                <Edit2 className="w-5 h-5 text-indigo-600" />
              ) : (
                <UserPlus className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            {userToEdit ? 'Edit User' : 'Add New User'}
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <div className="relative group">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className={getFieldClass('name')}
              />
            </div>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe"
                className={getFieldClass('username')}
              />
            </div>
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
            <div className="relative group">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:transform active:scale-[0.98] transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20 text-sm flex items-center justify-center gap-2"
            >
              {userToEdit ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {userToEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
