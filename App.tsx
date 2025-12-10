
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Briefcase,
  Clock,
  Menu,
  Plus,
  Home,
  Calendar,
  X,
  FilePlus2,
  LogOut,
  ListFilter,
  Search,
  User as UserIcon,
  Tag,
  Layers,
  Database,
  CheckSquare,
  Bell,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import { TimesheetEntry, TaskDefinition, User, TaskStatus } from './types';
import StatsCard from './components/StatsCard';
import TimesheetTable from './components/TimesheetTable';
import LogTimeModal from './components/LogTimeModal';
import AddProjectModal from './components/AddProjectModal';
import LoginScreen from './components/LoginScreen';
import GanttChart from './components/GanttChart';
import UserManagement from './components/UserManagement';
import TaskManagement from './components/TaskManagement';
import NotificationDropdown, { SystemNotification } from './components/NotificationDropdown';
import { generateMockTimesheets } from './services/geminiService';
import * as DB from './services/db';

// Helper for local date string YYYY-MM-DD
const getLocalDateStr = (d: Date) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// Helper to format decimal hours to "1h 30m" format
const formatDuration = (decimalHours: number) => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  if (m === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

type DateFilterMode = 'WEEK' | 'MONTH' | 'RANGE';
type ViewType = 'DASHBOARD' | 'USERS' | 'TASKS';

function App() {
  // DB Loading State
  const [isDbReady, setIsDbReady] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // App State
  const [view, setView] = useState<ViewType>('DASHBOARD');
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  
  // Date Filter States
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('WEEK');
  const [customRange, setCustomRange] = useState<{start: string, end: string}>({
     start: getLocalDateStr(new Date()),
     end: getLocalDateStr(new Date())
  });

  // Advanced Filter States
  const [searchInputValue, setSearchInputValue] = useState(''); // Immediate input value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // Debounced value for filtering
  const [filterUserId, setFilterUserId] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterTaskName, setFilterTaskName] = useState('ALL');

  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true); // Default collapsed on desktop
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null); // For Task Management
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for pre-filling modal from Gantt click
  const [logModalInitialDate, setLogModalInitialDate] = useState<string>(getLocalDateStr(new Date()));
  const [logModalInitialTask, setLogModalInitialTask] = useState<string>('');

  // Initialize DB
  useEffect(() => {
    const init = async () => {
      try {
        await DB.initDB();
        refreshData();
        setIsDbReady(true);
      } catch (err) {
        console.error("Failed to init DB", err);
      }
    };
    init();
  }, []);

  // Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchInputValue);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchInputValue]);

  const refreshData = () => {
    setUsers(DB.getUsers());
    setTasks(DB.getTasks());
    setEntries(DB.getTimesheets());
  };

  // Filter entries available to the current view (Manager sees all, Employee sees own)
  const accessibleEntries = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Manager') return entries;
    return entries.filter(e => e.userId === currentUser.id);
  }, [entries, currentUser]);

  // Derived lists for dropdowns
  const uniqueCategories = useMemo(() => Array.from(new Set(accessibleEntries.map(e => e.taskCategory))), [accessibleEntries]);
  const uniqueTaskNames = useMemo(() => Array.from(new Set(accessibleEntries.map(e => e.taskName))), [accessibleEntries]);

  // Helper to check if an entry matches the active attribute filters
  const matchesFilters = useCallback((e: TimesheetEntry) => {
    // 1. User Filter (Manager Only)
    if (filterUserId !== 'ALL' && e.userId !== filterUserId) return false;
    
    // 2. Category Filter
    if (filterCategory !== 'ALL' && e.taskCategory !== filterCategory) return false;
    
    // 3. Task/Project Filter
    if (filterTaskName !== 'ALL' && e.taskName !== filterTaskName) return false;
    
    // 4. Search Query (Use Debounced Value)
    if (debouncedSearchQuery) {
        const q = debouncedSearchQuery.toLowerCase();
        return e.taskName.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.userName.toLowerCase().includes(q);
    }
    
    return true;
  }, [filterUserId, filterCategory, filterTaskName, debouncedSearchQuery]);

  // Helper to get ranges based on mode
  const getViewDateRange = useCallback(() => {
    let start = new Date(currentDate);
    let end = new Date(currentDate);

    if (dateFilterMode === 'WEEK') {
        // Enforce Mon-Sun logic (7 days)
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6); // Monday + 6 = Sunday
    } else if (dateFilterMode === 'MONTH') {
        // Enforce 1st to Last Day of Month
        start.setDate(1);
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of selected month
    } else {
        // RANGE
        start = new Date(customRange.start);
        end = new Date(customRange.end);
    }
    // Normalize times
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return { start, end };
  }, [dateFilterMode, currentDate, customRange]);

  // View Filtered Data
  const filteredEntries = useMemo(() => {
    if (!currentUser) return [];

    // 1. Filter by Date Range (Base)
    const { start, end } = getViewDateRange();
    
    let result = accessibleEntries.filter(e => {
        // Parse date string carefully to avoid timezone shift
        const [y, m, d] = e.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d, 12, 0, 0); // Noon to avoid boundary issues
        return entryDate >= start && entryDate <= end;
    });

    // 2. Apply Attribute Filters (Search, User, Category, Task)
    result = result.filter(matchesFilters);

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [accessibleEntries, getViewDateRange, matchesFilters, currentUser]);

  // Dashboard KPI Stats
  const kpiStats = useMemo(() => {
    const attributeFiltered = accessibleEntries.filter(matchesFilters);

    // 1. Logged Today: Always use Real Today (Local Time), irrespective of the dashboard view date
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const daily = attributeFiltered.filter(e => e.date === todayStr).reduce((acc, c) => acc + c.durationHours, 0);

    // 2. Weekly/Monthly: Use the View Context (currentDate)
    // This allows "This Week" to mean "The Week Currently Being Viewed"
    const { start: viewStart, end: viewEnd } = { 
        start: new Date(currentDate), 
        end: new Date(currentDate) 
    };
    
    // Calculate week bounds for the currently viewed date
    const day = viewStart.getDay();
    const diff = viewStart.getDate() - day + (day === 0 ? -6 : 1);
    viewStart.setDate(diff);
    viewEnd.setDate(viewStart.getDate() + 6);
    viewStart.setHours(0,0,0,0); 
    viewEnd.setHours(23,59,59,999);

    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const weekly = attributeFiltered.filter(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d, 12, 0, 0);
        return entryDate >= viewStart && entryDate <= viewEnd;
    }).reduce((acc, c) => acc + c.durationHours, 0);
    
    const monthly = attributeFiltered.filter(e => e.date.startsWith(monthStr)).reduce((acc, c) => acc + c.durationHours, 0);

    return { daily, weekly, monthly };
  }, [accessibleEntries, currentDate, matchesFilters]);

  // Gantt Props
  const ganttProps = useMemo(() => {
     const { start, end } = getViewDateRange();
     const diffTime = Math.abs(end.getTime() - start.getTime());
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
     return { startDate: start, daysToShow: diffDays };
  }, [getViewDateRange]);

  // --- NOTIFICATION LOGIC (Manager Only) ---
  const notifications = useMemo(() => {
    if (currentUser?.role !== 'Manager') return [];
    
    const alerts: SystemNotification[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    tasks.forEach(task => {
        // 1. Check Overdue
        // Condition: Due Date exists, Due Date < Today, Status != Done
        if (task.dueDate && task.status !== 'Done') {
            const due = new Date(task.dueDate);
            due.setHours(0,0,0,0);
            
            if (due < today) {
                alerts.push({
                    id: `overdue-${task.id}`,
                    type: 'OVERDUE',
                    title: 'Task Overdue',
                    message: `Task "${task.name}" was due on ${task.dueDate} and is not yet done.`,
                    severity: 'high'
                });
            }
        }

        // 2. Check Overtime (Over Estimate)
        // Condition: Estimated Hours exists, Total Logged > Estimate
        if (task.estimatedHours) {
            const totalLogged = entries
                .filter(e => e.taskName === task.name)
                .reduce((sum, e) => sum + e.durationHours, 0);

            if (totalLogged > task.estimatedHours) {
                const overage = (totalLogged - task.estimatedHours).toFixed(1);
                alerts.push({
                    id: `overtime-${task.id}`,
                    type: 'OVERTIME',
                    title: 'Budget Exceeded',
                    message: `Task "${task.name}" is ${overage}h over its estimated budget of ${task.estimatedHours}h.`,
                    severity: 'medium'
                });
            }
        }
    });

    return alerts;
  }, [tasks, entries, currentUser]);


  // Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    clearFilters();
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleGenerateData = async () => {
    if (currentUser?.role !== 'Manager') return;
    const newEntries = await generateMockTimesheets(getLocalDateStr(currentDate), 5);
    if (newEntries.length > 0) {
      newEntries.forEach(entry => DB.addTimesheetEntry(entry));
      refreshData();
    }
  };
  
  // --- EXPORT / IMPORT HANDLERS ---
  
  const exportToCSV = (data: TimesheetEntry[], filename: string) => {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }
    const headers = ['ID', 'Date', 'Start Time', 'End Time', 'Duration', 'Task', 'Category', 'User', 'Description', 'Manager Comment'];
    const csvContent = [
        headers.join(','),
        ...data.map(e => {
            const row = [
                e.id,
                e.date,
                e.startTime,
                e.endTime,
                e.durationHours.toFixed(2),
                `"${e.taskName.replace(/"/g, '""')}"`,
                e.taskCategory,
                `"${e.userName.replace(/"/g, '""')}"`,
                `"${(e.description || '').replace(/"/g, '""')}"`,
                `"${(e.managerComment || '').replace(/"/g, '""')}"`
            ];
            return row.join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDB = () => {
    const sql = DB.exportDatabaseSQL();
    const blob = new Blob([sql], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronoguard_backup_${new Date().toISOString().slice(0,10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const sql = event.target?.result as string;
          if (sql) {
              try {
                  DB.importDatabaseSQL(sql);
                  refreshData();
                  alert("Database imported successfully!");
              } catch (err) {
                  alert("Failed to import database. Please check the file format.");
              }
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };


  // --- VALIDATION HELPERS ---
  const checkOverlap = (userId: string, date: string, start: string, end: string, excludeId?: string) => {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const newStart = toMins(start);
    const newEnd = toMins(end);

    const userEntries = entries.filter(e => e.userId === userId && e.date === date && e.id !== excludeId);
    
    return userEntries.some(e => {
      const eStart = toMins(e.startTime);
      const eEnd = toMins(e.endTime);
      return newStart < eEnd && newEnd > eStart;
    });
  };

  const checkWeeklyLimit = (userId: string, dateStr: string, addDuration: number, excludeId?: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d);
    weekStart.setDate(diff);
    weekStart.setHours(0,0,0,0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23,59,59,999);

    const weekEntries = entries.filter(e => {
       if (e.userId !== userId) return false;
       if (e.id === excludeId) return false;
       const [y, m, day] = e.date.split('-').map(Number);
       const eDate = new Date(y, m-1, day, 12);
       return eDate >= weekStart && eDate <= weekEnd;
    });

    const currentTotal = weekEntries.reduce((acc, e) => acc + e.durationHours, 0);
    return (currentTotal + addDuration) > 40;
  };

  const checkTaskLimit = (taskName: string, addDuration: number, excludeId?: string) => {
     const taskDef = tasks.find(t => t.name === taskName);
     if (!taskDef || !taskDef.estimatedHours) return { exceeded: false, limit: 0, current: 0 };

     const totalLogged = entries
        .filter(e => e.taskName === taskName && e.id !== excludeId)
        .reduce((sum, e) => sum + e.durationHours, 0);
      
     return {
        exceeded: (totalLogged + addDuration) > taskDef.estimatedHours,
        limit: taskDef.estimatedHours,
        current: totalLogged
     };
  };

  const handleSaveEntry = (entryData: Omit<TimesheetEntry, 'id' | 'userId' | 'userName'>): string | null => {
    if (!currentUser) return "Session invalid. Please login again.";
    
    const targetUserId = editingEntry ? editingEntry.userId : currentUser.id;

    if (checkOverlap(targetUserId, entryData.date, entryData.startTime, entryData.endTime, editingEntry?.id)) {
      return "Time entry overlaps with an existing entry.";
    }

    if (checkWeeklyLimit(targetUserId, entryData.date, entryData.durationHours, editingEntry?.id)) {
      return "This entry exceeds the 40-hour weekly limit.";
    }

    const taskCheck = checkTaskLimit(entryData.taskName, entryData.durationHours, editingEntry?.id);
    if (taskCheck.exceeded) {
       const isConfirmed = window.confirm(
         `Warning: This entry will exceed the estimated limit for ${entryData.taskName}.\n\n` +
         `Estimated Limit: ${taskCheck.limit}h\n` +
         `Current Total: ${taskCheck.current.toFixed(1)}h\n` +
         `New Entry: ${entryData.durationHours.toFixed(1)}h\n\n` +
         `Do you want to log this as Overtime?`
       );
       if (!isConfirmed) return "Action cancelled. Budget limit exceeded.";
    }

    if (editingEntry) {
      const updatedEntry: TimesheetEntry = { ...editingEntry, ...entryData };
      DB.updateTimesheetEntry(updatedEntry);
      setEditingEntry(null);
    } else {
      const newEntry: TimesheetEntry = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        ...entryData
      };
      DB.addTimesheetEntry(newEntry);
    }
    refreshData();
    setLogModalOpen(false);
    return null;
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    if (currentUser?.role !== 'Manager' && entry.userId !== currentUser?.id) return;
    setEditingEntry(entry);
    setLogModalInitialDate(entry.date);
    setLogModalInitialTask(entry.taskName);
    setLogModalOpen(true);
  };

  const handleDeleteEntry = (entry: TimesheetEntry) => {
    if (currentUser?.role !== 'Manager' && entry.userId !== currentUser?.id) {
       alert("You do not have permission to delete this entry.");
       return;
    }

    if (window.confirm("Are you sure you want to delete this time entry? This action cannot be undone.")) {
       DB.deleteTimesheetEntry(entry.id);
       refreshData();
    }
  };

  const handleGanttCellClick = (date: Date, taskName?: string) => {
     setEditingEntry(null);
     setLogModalInitialDate(getLocalDateStr(date));
     setLogModalInitialTask(taskName || '');
     setLogModalOpen(true);
  };

  const handleModalClose = () => {
    setLogModalOpen(false);
    setEditingEntry(null);
  };

  // --- TASK MANAGEMENT HANDLERS ---
  const handleSaveTask = (newTask: TaskDefinition) => {
    if (currentUser?.role !== 'Manager') return;
    DB.addTask(newTask);
    refreshData();
  };

  const handleEditTask = (task: TaskDefinition) => {
    setEditingTask(task);
    setProjectModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (currentUser?.role !== 'Manager') return;
    if (window.confirm("Are you sure you want to delete this task? Associated time entries will lose their task reference.")) {
      DB.deleteTask(taskId);
      refreshData();
    }
  };

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        DB.addTask({ ...task, status: newStatus });
        refreshData();
    }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleAddUser = (userData: Omit<User, 'id'>) => {
    if (currentUser?.role !== 'Manager') return;
    const newUser: User = {
      id: `u-${Date.now()}`,
      ...userData
    };
    DB.addUser(newUser);
    refreshData();
  };

  const handleEditUser = (updatedUser: User) => {
    if (currentUser?.role !== 'Manager') return;
    DB.updateUser(updatedUser);
    refreshData();
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser?.role !== 'Manager') return;
    DB.deleteUser(userId);
    refreshData();
  };

  const clearFilters = () => {
      setSearchInputValue('');
      setDebouncedSearchQuery('');
      setFilterUserId('ALL');
      setFilterCategory('ALL');
      setFilterTaskName('ALL');
  };

  const formatDateRangeDisplay = () => {
    const { start, end } = getViewDateRange();
    if (dateFilterMode === 'MONTH') {
        return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (dateFilterMode === 'WEEK') {
        newDate.setDate(newDate.getDate() + 7);
    } else if (dateFilterMode === 'MONTH') {
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setDate(1);
    }
    setCurrentDate(newDate);
  };

  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (dateFilterMode === 'WEEK') {
        newDate.setDate(newDate.getDate() - 7);
    } else if (dateFilterMode === 'MONTH') {
        newDate.setMonth(newDate.getMonth() - 1);
        newDate.setDate(1);
    }
    setCurrentDate(newDate);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleDesktopSidebar = () => setIsDesktopCollapsed(!isDesktopCollapsed);
  const isFilterActive = debouncedSearchQuery !== '' || filterUserId !== 'ALL' || filterCategory !== 'ALL' || filterTaskName !== 'ALL';

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Database className="w-12 h-12 text-indigo-600 animate-pulse mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">Initializing SQLite Database...</h2>
        <p className="text-sm text-slate-500 mt-2">Setting up secure storage environment</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen flex flex-col
        ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        <div className="p-4 md:p-6 flex items-center justify-between shrink-0 h-20">
          {(!isDesktopCollapsed || isMobileMenuOpen) && (
            <h1 className="text-xl font-bold text-indigo-700 tracking-tight flex items-center gap-2">
              <span className="hidden md:inline">Time<span className="text-slate-700">sheet</span></span>
              <span className="md:hidden">Timesheet</span>
            </h1>
          )}
          {isDesktopCollapsed && !isMobileMenuOpen && (
             <div className="mx-auto text-indigo-700 font-bold text-xl">TS</div>
          )}
          
          <button onClick={toggleDesktopSidebar} className="hidden md:block p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
             <Menu className="w-5 h-5" />
          </button>
          
          <button onClick={toggleMobileMenu} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
             <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-2 overflow-y-auto">
          <button 
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${view === 'DASHBOARD' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} 
            onClick={() => { setView('DASHBOARD'); clearFilters(); setIsMobileMenuOpen(false); }}
            title="Dashboard"
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {(!isDesktopCollapsed || isMobileMenuOpen) && <span>Dashboard</span>}
          </button>
          
          {currentUser.role === 'Manager' && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <p className={`px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 ${isDesktopCollapsed ? 'hidden' : 'block'}`}>Manage</p>
              <button 
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${view === 'TASKS' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => { setView('TASKS'); setIsMobileMenuOpen(false); }}
                title="Tasks"
              >
                <CheckSquare className="w-5 h-5 flex-shrink-0" />
                {(!isDesktopCollapsed || isMobileMenuOpen) && <span>Tasks</span>}
              </button>
              <button 
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${view === 'USERS' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => { setView('USERS'); setIsMobileMenuOpen(false); }}
                title="Team Members"
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {(!isDesktopCollapsed || isMobileMenuOpen) && <span>Team Members</span>}
              </button>
            </div>
          )}
        </nav>
        
        {(!isDesktopCollapsed || isMobileMenuOpen) && currentUser.role === 'Manager' && (
          <div className="p-4 m-4 bg-indigo-900 rounded-xl text-white shrink-0">
            <p className="text-xs font-medium text-indigo-200 uppercase mb-2">Data Tools</p>
            <div className="space-y-2">
                <button 
                  onClick={() => exportToCSV(entries, `full_timesheet_export_${new Date().toISOString().slice(0,10)}.csv`)}
                  className="w-full bg-indigo-800 text-indigo-100 text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  title="Export All CSV"
                >
                  <FileText className="w-3 h-3" /> Export CSV
                </button>
                <button 
                  onClick={() => { handleGenerateData(); setIsMobileMenuOpen(false); }}
                  className="w-full bg-white text-indigo-900 text-xs font-bold py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-3 h-3" /> Gen Data
                </button>
                <div className="flex gap-2">
                   <button 
                    onClick={handleExportDB}
                    className="flex-1 bg-indigo-800 text-indigo-100 text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                    title="Export SQL"
                  >
                    <Download className="w-3 h-3" /> SQL Exp
                  </button>
                  <button 
                    onClick={handleImportClick}
                    className="flex-1 bg-indigo-800 text-indigo-100 text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                    title="Import SQL"
                  >
                    <Upload className="w-3 h-3" /> SQL Imp
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".sql" />
                </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-3 md:h-20 shrink-0 z-10 gap-3">
          
          <div className="flex items-center justify-start w-full md:w-auto">
            <div className="flex items-center gap-3">
              <button onClick={toggleMobileMenu} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <Menu className="w-6 h-6" />
              </button>
              {view === 'USERS' && (
                 <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 truncate">
                   User Management
                 </h2>
              )}
              {view === 'TASKS' && (
                 <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 truncate">
                   Task Management
                 </h2>
              )}
            </div>

             {/* Date Filters Toolbar (Dashboard Only) - Aligned Left */}
             {view === 'DASHBOARD' && (
               <div className="flex items-center justify-between md:justify-start gap-2 bg-slate-50 md:bg-transparent p-1 md:p-0 rounded-lg">
                 <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
                    {(['WEEK', 'MONTH', 'RANGE'] as DateFilterMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setDateFilterMode(mode)}
                        className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${dateFilterMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {mode === 'WEEK' ? 'Week' : mode === 'MONTH' ? 'Month' : 'Custom'}
                      </button>
                    ))}
                 </div>

                 <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

                 {dateFilterMode !== 'RANGE' ? (
                   <div className="flex items-center gap-1 md:gap-2">
                      <button 
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                        onClick={handlePrevDate}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs md:text-sm font-semibold text-slate-700 min-w-[90px] md:min-w-[120px] text-center">
                        {formatDateRangeDisplay()}
                      </span>
                      <button 
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                        onClick={handleNextDate}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                   </div>
                 ) : (
                   <div className="flex items-center gap-1 md:gap-2">
                     <input 
                       type="date" 
                       value={customRange.start} 
                       onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))}
                       className="w-24 md:w-auto px-2 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                     <span className="text-slate-400">-</span>
                     <input 
                       type="date" 
                       value={customRange.end} 
                       onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))}
                       className="w-24 md:w-auto px-2 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                   </div>
                 )}
               </div>
             )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
             <div className="flex items-center justify-end gap-2 md:gap-4 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                {currentUser.role === 'Manager' && view === 'DASHBOARD' && (
                  <button 
                      onClick={() => { setEditingTask(null); setProjectModalOpen(true); }}
                      className="flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors shadow-sm active:scale-95"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span className="hidden sm:inline">New Task</span>
                    </button>
                )}
                
                <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                {currentUser.role === 'Manager' && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative"
                    >
                      <Bell className="w-5 h-5" />
                      {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </button>
                    <NotificationDropdown 
                      isOpen={isNotificationOpen} 
                      onClose={() => setIsNotificationOpen(false)}
                      notifications={notifications}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pl-1">
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">{currentUser.role}</p>
                    </div>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm shrink-0">
                      {currentUser.name.charAt(0)}
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="p-1.5 md:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/50">
          
          {view === 'USERS' ? (
            <UserManagement 
              users={users} 
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
            />
          ) : view === 'TASKS' ? (
             <TaskManagement 
                tasks={tasks}
                onAddTask={() => { setEditingTask(null); setProjectModalOpen(true); }}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onStatusChange={handleTaskStatusChange}
             />
          ) : (
            // DASHBOARD VIEW
            <div className="space-y-6">
                
                {/* Advanced Filter Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                     <div className="flex items-center gap-2 text-slate-500">
                        <ListFilter className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider hidden md:inline">Filters</span>
                     </div>
                     <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                     
                     <div className="grid grid-cols-2 md:flex flex-1 gap-3">
                        <div className="relative col-span-2 md:col-span-1 md:min-w-[200px] flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search tasks, descriptions..." 
                            value={searchInputValue}
                            onChange={(e) => setSearchInputValue(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>

                        {currentUser.role === 'Manager' && (
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                              value={filterUserId}
                              onChange={(e) => setFilterUserId(e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                            >
                              <option value="ALL">All Employees</option>
                              {users.filter(u => u.role === 'Employee').map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="relative">
                          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={filterTaskName}
                            onChange={(e) => setFilterTaskName(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer max-w-[200px]"
                          >
                            <option value="ALL">All Projects</option>
                            {uniqueTaskNames.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                          >
                            <option value="ALL">All Categories</option>
                            {uniqueCategories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                     </div>

                     {isFilterActive && (
                       <button 
                         onClick={clearFilters}
                         className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                       >
                         <X className="w-4 h-4" />
                         Clear
                       </button>
                     )}
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatsCard 
                    title={`Logged Today`} 
                    value={formatDuration(kpiStats.daily)} 
                    trend="vs yesterday" 
                    icon={Clock} 
                    color="bg-indigo-500" 
                  />
                  <StatsCard 
                    title="This Week" 
                    value={formatDuration(kpiStats.weekly)} 
                    icon={CalendarDays} 
                    color="bg-emerald-500" 
                  />
                  <StatsCard 
                    title="This Month" 
                    value={formatDuration(kpiStats.monthly)} 
                    icon={Briefcase} 
                    color="bg-amber-500" 
                  />
                </div>

                {/* Gantt Chart Area */}
                <GanttChart 
                  entries={filteredEntries} 
                  allEntries={entries}
                  tasks={tasks}
                  startDate={ganttProps.startDate} 
                  daysToShow={ganttProps.daysToShow}
                  onTaskClick={(task) => setFilterTaskName(task === filterTaskName ? 'ALL' : task)}
                  onEntryClick={handleEditEntry}
                  onCellClick={handleGanttCellClick}
                  onUserClick={(uid) => setFilterUserId(uid === filterUserId ? 'ALL' : uid)}
                />

                {/* Activity Log Area */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       <Clock className="w-5 h-5 text-slate-400" />
                       Activity Log
                    </h2>
                    <button 
                       onClick={() => exportToCSV(filteredEntries, `timesheet_view_export_${new Date().toISOString().slice(0,10)}.csv`)}
                       className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                       title="Export filtered view to CSV"
                    >
                       <FileText className="w-4 h-4" /> Export CSV
                    </button>
                  </div>
                  <TimesheetTable 
                    entries={filteredEntries} 
                    allEntries={entries}
                    tasks={tasks}
                    onTaskClick={(task) => setFilterTaskName(task === filterTaskName ? 'ALL' : task)}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                    showUserColumn={currentUser.role === 'Manager'}
                  />
                </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <LogTimeModal 
        isOpen={isLogModalOpen} 
        onClose={handleModalClose} 
        onSave={handleSaveEntry}
        initialDate={logModalInitialDate}
        initialTaskName={logModalInitialTask}
        taskOptions={tasks}
        entryToEdit={editingEntry}
        currentUser={currentUser}
      />

      <AddProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => { setProjectModalOpen(false); setEditingTask(null); }} 
        onSave={handleSaveTask}
        taskToEdit={editingTask}
      />

    </div>
  );
}

export default App;
