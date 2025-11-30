
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import { TimesheetEntry, TaskDefinition, User } from './types';
import StatsCard from './components/StatsCard';
import TimesheetTable from './components/TimesheetTable';
import LogTimeModal from './components/LogTimeModal';
import AddProjectModal from './components/AddProjectModal';
import LoginScreen from './components/LoginScreen';
import GanttChart from './components/GanttChart';
import UserManagement from './components/UserManagement';
import { generateMockTimesheets } from './services/geminiService';
import * as DB from './services/db';

// Helper for local date string YYYY-MM-DD
const getLocalDateStr = (d: Date) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

type DateFilterMode = 'WEEK' | 'MONTH' | 'RANGE';
type ViewType = 'DASHBOARD' | 'USERS';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUserId, setFilterUserId] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterTaskName, setFilterTaskName] = useState('ALL');

  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true); // Default collapsed on desktop

  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  
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
    
    // 4. Search Query
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return e.taskName.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.userName.toLowerCase().includes(q);
    }
    
    return true;
  }, [filterUserId, filterCategory, filterTaskName, searchQuery]);

  // Helper to get ranges based on mode
  const getViewDateRange = useCallback(() => {
    let start = new Date(currentDate);
    let end = new Date(currentDate);

    if (dateFilterMode === 'WEEK') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
    } else if (dateFilterMode === 'MONTH') {
        start.setDate(1);
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
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

  // Dashboard KPI Stats (Daily/Weekly/Monthly relative to current cursor)
  // NOW RESPECTS ATTRIBUTE FILTERS (e.g. if User=Alex selected, stats show Alex's hours)
  const kpiStats = useMemo(() => {
    // Base set of entries to calculate stats from (all time, but filtered by user/category/etc)
    const attributeFiltered = accessibleEntries.filter(matchesFilters);

    const dateStr = getLocalDateStr(currentDate);
    const { start: weekStart, end: weekEnd } = { 
        start: new Date(currentDate), 
        end: new Date(currentDate) 
    };
    // Re-calc simple week for KPI
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekStart.setHours(0,0,0,0); weekEnd.setHours(23,59,59,999);

    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const daily = attributeFiltered.filter(e => e.date === dateStr).reduce((acc, c) => acc + c.durationHours, 0);
    const weekly = attributeFiltered.filter(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d, 12, 0, 0);
        return entryDate >= weekStart && entryDate <= weekEnd;
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
      // Add entries to DB
      newEntries.forEach(entry => DB.addTimesheetEntry(entry));
      refreshData();
    }
  };

  // --- VALIDATION HELPERS ---
  const checkOverlap = (userId: string, date: string, start: string, end: string, excludeId?: string) => {
    // Convert HH:mm to minutes
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
      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      return newStart < eEnd && newEnd > eStart;
    });
  };

  const checkWeeklyLimit = (userId: string, dateStr: string, addDuration: number, excludeId?: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
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

  const handleSaveEntry = (entryData: Omit<TimesheetEntry, 'id' | 'userId' | 'userName' | 'status'>) => {
    if (!currentUser) return;
    
    // Determine User ID (Editing self or creating for self)
    const targetUserId = editingEntry ? editingEntry.userId : currentUser.id;

    // 1. Validation: Overlap
    if (checkOverlap(targetUserId, entryData.date, entryData.startTime, entryData.endTime, editingEntry?.id)) {
      alert("Error: Time entry overlaps with an existing entry.");
      return;
    }

    // 2. Validation: 40 Hours Limit
    if (checkWeeklyLimit(targetUserId, entryData.date, entryData.durationHours, editingEntry?.id)) {
      alert("Error: This entry exceeds the 40-hour weekly limit.");
      return;
    }

    if (editingEntry) {
      const updatedEntry: TimesheetEntry = { ...editingEntry, ...entryData, status: 'Pending' };
      DB.updateTimesheetEntry(updatedEntry);
      setEditingEntry(null);
    } else {
      const newEntry: TimesheetEntry = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        status: 'Pending',
        ...entryData
      };
      DB.addTimesheetEntry(newEntry);
    }
    refreshData();
    setLogModalOpen(false);
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    if (currentUser?.role !== 'Manager' && entry.userId !== currentUser?.id) return;
    setEditingEntry(entry);
    setLogModalInitialDate(entry.date);
    setLogModalInitialTask(entry.taskName);
    setLogModalOpen(true);
  };

  const handleGanttCellClick = (date: Date, taskName?: string) => {
     // Pre-fill modal for new entry
     setEditingEntry(null);
     setLogModalInitialDate(getLocalDateStr(date));
     setLogModalInitialTask(taskName || '');
     setLogModalOpen(true);
  };

  const handleModalClose = () => {
    setLogModalOpen(false);
    setEditingEntry(null);
  };

  const handleAddProject = (newTask: TaskDefinition) => {
    if (currentUser?.role !== 'Manager') return;
    DB.addTask(newTask);
    refreshData();
  };

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
      setSearchQuery('');
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
    }
    setCurrentDate(newDate);
  };

  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (dateFilterMode === 'WEEK') {
        newDate.setDate(newDate.getDate() - 7);
    } else if (dateFilterMode === 'MONTH') {
        newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  // Toggle Sidebar Handlers
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleDesktopSidebar = () => setIsDesktopCollapsed(!isDesktopCollapsed);

  const isFilterActive = searchQuery !== '' || filterUserId !== 'ALL' || filterCategory !== 'ALL' || filterTaskName !== 'ALL';

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
            <div className="pt-2">
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
        
        {(!isDesktopCollapsed || isMobileMenuOpen) && currentUser.role === 'Manager' && view === 'DASHBOARD' && (
          <div className="p-4 m-4 bg-indigo-900 rounded-xl text-white shrink-0">
            <p className="text-xs font-medium text-indigo-200 uppercase mb-2">Dev Tools</p>
            <button 
              onClick={() => { handleGenerateData(); setIsMobileMenuOpen(false); }}
              className="w-full bg-white text-indigo-900 text-xs font-bold py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Generate Mock Data
            </button>
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
                      onClick={() => setProjectModalOpen(true)}
                      className="flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors shadow-sm active:scale-95"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span className="hidden sm:inline">New Task</span>
                    </button>
                )}
                {/* Log Time Button Removed */}
                
                <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

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
          ) : (
            // DASHBOARD VIEW
            <div className="space-y-6">
                
                {/* Advanced Filter Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row flex-wrap gap-4 md:items-center">
                  <div className="flex items-center gap-2 text-slate-500 font-medium text-sm border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-4 md:mr-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </div>

                  {/* Search */}
                  <div className="relative group w-full md:w-auto">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                     <input 
                       type="text" 
                       placeholder="Search tasks..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full md:w-48 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                     />
                  </div>

                  {/* Filter Group - Grid on mobile, flex on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
                      {/* User Filter (Manager Only) */}
                      {currentUser.role === 'Manager' && (
                        <div className="relative w-full md:w-auto">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <select 
                            value={filterUserId}
                            onChange={(e) => setFilterUserId(e.target.value)}
                            className="w-full md:w-auto pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer md:min-w-[140px]"
                          >
                            <option value="ALL">All Employees</option>
                            {users.filter(u => u.role === 'Employee').map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Category Filter */}
                      <div className="relative w-full md:w-auto">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Tag className="w-4 h-4" />
                        </div>
                        <select 
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full md:w-auto pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer md:min-w-[140px]"
                        >
                          <option value="ALL">All Categories</option>
                          {uniqueCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Project / Task Filter */}
                      <div className="relative w-full md:w-auto">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <select 
                          value={filterTaskName}
                          onChange={(e) => setFilterTaskName(e.target.value)}
                          className="w-full md:w-auto pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer md:min-w-[140px] md:max-w-[200px] truncate"
                        >
                          <option value="ALL">All Projects</option>
                          {uniqueTaskNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                  </div>

                  {isFilterActive && (
                    <button 
                      onClick={clearFilters}
                      className="ml-auto w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-dashed border-slate-300 md:border-transparent"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Row 1: High Level Stats (KPIS) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <StatsCard 
                    title="Daily Hours (Today)" 
                    value={`${kpiStats.daily.toFixed(1)}h`} 
                    trend={kpiStats.daily >= 8 ? "On Track" : "Below Goal"} 
                    trendUp={kpiStats.daily >= 8} 
                    icon={Clock} 
                    color="text-blue-600 bg-blue-100" 
                  />
                  <StatsCard 
                    title="Weekly Total" 
                    value={`${kpiStats.weekly.toFixed(1)}h`} 
                    trend="Current Week"
                    trendUp={true} 
                    icon={CalendarDays} 
                    color="text-indigo-600 bg-indigo-100" 
                  />
                  <StatsCard 
                    title="Monthly Total" 
                    value={`${kpiStats.monthly.toFixed(1)}h`} 
                    icon={Calendar} 
                    color="text-purple-600 bg-purple-100" 
                  />
                </div>

                {/* Row 2: Charts (Contextual to Filter) */}
                <div className="w-full overflow-hidden">
                  {/* Gantt Chart */}
                    <GanttChart 
                      entries={filteredEntries} 
                      allEntries={entries}
                      startDate={ganttProps.startDate}
                      daysToShow={ganttProps.daysToShow}
                      onTaskClick={(name) => setFilterTaskName(name)} 
                      onEntryClick={handleEditEntry}
                      onCellClick={handleGanttCellClick}
                    />
                </div>

                {/* Row 3: Recent Activity */}
                <div className="w-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-lg">
                        Activity Log
                      </h3>
                      <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded">
                        {filteredEntries.length} entries found
                      </span>
                    </div>
                    {/* Pass all entries for dependency checking */}
                    <TimesheetTable 
                      entries={filteredEntries} 
                      allEntries={entries} 
                      onTaskClick={(name) => setFilterTaskName(name)} 
                      onEdit={handleEditEntry}
                      showUserColumn={currentUser.role === 'Manager'}
                    />
                </div>
            </div>
          )}
        </div>
      </main>

      <LogTimeModal 
        isOpen={isLogModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveEntry}
        initialDate={logModalInitialDate}
        initialTaskName={logModalInitialTask}
        availableTasks={entries}
        taskOptions={tasks}
        entryToEdit={editingEntry}
        currentUser={currentUser}
      />

      <AddProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleAddProject}
      />
    </div>
  );
}

export default App;
