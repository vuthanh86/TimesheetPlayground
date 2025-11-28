import React, { useState, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  PieChart, 
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
  ListFilter
} from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { TimesheetEntry, AIAnalysisResult, TaskDefinition, User } from './types';
import StatsCard from './components/StatsCard';
import TimesheetTable from './components/TimesheetTable';
import AIAnalysisPanel from './components/AIAnalysisPanel';
import LogTimeModal from './components/LogTimeModal';
import AddProjectModal from './components/AddProjectModal';
import LoginScreen from './components/LoginScreen';
import GanttChart from './components/GanttChart';
import UserManagement from './components/UserManagement';
import { analyzeTimesheetData, generateMockTimesheets } from './services/geminiService';

// Constants
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b'];

const MOCK_USERS_INIT: User[] = [
  { id: 'm1', username: 'admin', name: 'Sarah Manager', role: 'Manager' },
  { id: 'u1', username: 'alex', name: 'Alex Dev', role: 'Employee' },
  { id: 'u2', username: 'jane', name: 'Jane Designer', role: 'Employee' },
];

// Helper for local date string YYYY-MM-DD
const getLocalDateStr = (d: Date) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// Generate dynamic initial data based on current week
const getInitialData = (): TimesheetEntry[] => {
  const today = new Date();
  const day = today.getDay(); 
  // Calculate Monday of current week
  const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diffToMon);

  const getDateStr = (offset: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return getLocalDateStr(d);
  };

  return [
    // Alex's Entries
    { id: '1', userId: 'u1', userName: 'Alex Dev', date: getDateStr(0), startTime: '09:00', endTime: '12:00', durationHours: 3, taskName: 'PROJ-101: Authentication System', taskCategory: 'Development', description: 'Implemented login flow', status: 'Approved' },
    { id: '2', userId: 'u1', userName: 'Alex Dev', date: getDateStr(0), startTime: '13:00', endTime: '17:00', durationHours: 4, taskName: 'PROJ-103: User Profile Settings', taskCategory: 'Development', description: 'Refactored user service', status: 'Approved', dependencies: ['1'] },
    { id: '3', userId: 'u1', userName: 'Alex Dev', date: getDateStr(1), startTime: '10:00', endTime: '11:00', durationHours: 1, taskName: 'INT-001: Weekly Team Sync', taskCategory: 'Meeting', description: 'Daily standup', status: 'Approved' },
    { id: '4', userId: 'u1', userName: 'Alex Dev', date: getDateStr(1), startTime: '11:00', endTime: '18:00', durationHours: 7, taskName: 'PROJ-102: Dashboard Analytics', taskCategory: 'Design', description: 'UI mockups for dashboard', status: 'Pending' },
    { id: '5', userId: 'u1', userName: 'Alex Dev', date: getDateStr(2), startTime: '09:00', endTime: '15:00', durationHours: 6, taskName: 'PROJ-102: Dashboard Analytics', taskCategory: 'Development', description: 'API integration', status: 'Approved', dependencies: ['2'] },
    { id: '6', userId: 'u1', userName: 'Alex Dev', date: getDateStr(2), startTime: '15:00', endTime: '17:00', durationHours: 2, taskName: 'PROJ-104: API Rate Limiting', taskCategory: 'Testing', description: 'Unit tests for API', status: 'Pending', dependencies: ['5'] },
    
    // Jane's Entries
    { id: '7', userId: 'u2', userName: 'Jane Designer', date: getDateStr(0), startTime: '10:00', endTime: '16:00', durationHours: 6, taskName: 'PROJ-105: Mobile Responsive Layout', taskCategory: 'Design', description: 'High fidelity mobile mocks', status: 'Approved' },
    { id: '8', userId: 'u2', userName: 'Jane Designer', date: getDateStr(1), startTime: '09:00', endTime: '12:00', durationHours: 3, taskName: 'INT-001: Weekly Team Sync', taskCategory: 'Meeting', description: 'Sync with Devs', status: 'Approved' },
  ];
};

const INITIAL_TASKS: TaskDefinition[] = [
  { id: 'PROJ-101', name: 'PROJ-101: Authentication System' },
  { id: 'PROJ-102', name: 'PROJ-102: Dashboard Analytics' },
  { id: 'PROJ-103', name: 'PROJ-103: User Profile Settings' },
  { id: 'PROJ-104', name: 'PROJ-104: API Rate Limiting' },
  { id: 'PROJ-105', name: 'PROJ-105: Mobile Responsive Layout' },
  { id: 'MAINT-001', name: 'MAINT-001: Legacy Code Refactoring' },
  { id: 'BUG-204', name: 'BUG-204: Fix Login Timeout' },
  { id: 'INT-001', name: 'INT-001: Weekly Team Sync' },
];

type DateFilterMode = 'WEEK' | 'MONTH' | 'RANGE';
type ViewType = 'DASHBOARD' | 'USERS';

function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS_INIT);

  // App State
  const [view, setView] = useState<ViewType>('DASHBOARD');
  // Initialize with dynamic data so "This Week" is populated
  const [entries, setEntries] = useState<TimesheetEntry[]>(getInitialData);
  const [tasks, setTasks] = useState<TaskDefinition[]>(INITIAL_TASKS);
  
  // Filter States
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('WEEK');
  const [customRange, setCustomRange] = useState<{start: string, end: string}>({
     start: getLocalDateStr(new Date()),
     end: getLocalDateStr(new Date())
  });
  const [activeFilter, setActiveFilter] = useState<{ type: 'CATEGORY' | 'TASK_NAME', value: string } | null>(null);

  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  // Filter entries available to the current view (Manager sees all, Employee sees own)
  const accessibleEntries = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Manager') return entries;
    return entries.filter(e => e.userId === currentUser.id);
  }, [entries, currentUser]);

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

    // 2. Apply Drill Down Filter
    if (activeFilter) {
      result = result.filter(e => 
          activeFilter.type === 'CATEGORY' 
            ? e.taskCategory === activeFilter.value 
            : e.taskName === activeFilter.value
        );
    }

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [accessibleEntries, getViewDateRange, activeFilter, currentUser]);

  // View Stats (Derived from filteredEntries)
  const viewStats = useMemo(() => {
     const totalHours = filteredEntries.reduce((acc, curr) => acc + curr.durationHours, 0);
     
     // Task Distribution
     const taskGroups: Record<string, number> = {};
     filteredEntries.forEach(e => {
       taskGroups[e.taskCategory] = (taskGroups[e.taskCategory] || 0) + e.durationHours;
     });
     const taskData = Object.keys(taskGroups).map(key => ({
       name: key,
       value: taskGroups[key]
     }));

     return { totalHours, taskData };
  }, [filteredEntries]);

  // Dashboard KPI Stats (Daily/Weekly/Monthly relative to current cursor)
  // Kept separate to provide context regardless of view mode
  const kpiStats = useMemo(() => {
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

    const daily = accessibleEntries.filter(e => e.date === dateStr).reduce((acc, c) => acc + c.durationHours, 0);
    const weekly = accessibleEntries.filter(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d, 12, 0, 0);
        return entryDate >= weekStart && entryDate <= weekEnd;
    }).reduce((acc, c) => acc + c.durationHours, 0);
    const monthly = accessibleEntries.filter(e => e.date.startsWith(monthStr)).reduce((acc, c) => acc + c.durationHours, 0);

    return { daily, weekly, monthly };
  }, [accessibleEntries, currentDate]);

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
    setActiveFilter(null);
    setAnalysis(null);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeTimesheetData(filteredEntries);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [filteredEntries]);

  const handleGenerateData = async () => {
    if (currentUser?.role !== 'Manager') return;
    setIsAnalyzing(true); 
    const newEntries = await generateMockTimesheets(getLocalDateStr(currentDate), 5);
    if (newEntries.length > 0) {
      setEntries(prev => [...prev, ...newEntries]);
    }
    setIsAnalyzing(false);
  };

  const handleSaveEntry = (entryData: Omit<TimesheetEntry, 'id' | 'userId' | 'userName' | 'status'>) => {
    if (!currentUser) return;
    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, ...entryData, status: 'Pending' } : e));
      setEditingEntry(null);
    } else {
      const newEntry: TimesheetEntry = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        status: 'Pending',
        ...entryData
      };
      setEntries(prev => [newEntry, ...prev]);
    }
    setLogModalOpen(false);
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    if (currentUser?.role !== 'Manager' && entry.userId !== currentUser?.id) return;
    setEditingEntry(entry);
    setLogModalOpen(true);
  };

  const handleModalClose = () => {
    setLogModalOpen(false);
    setEditingEntry(null);
  };

  const handleAddProject = (newTask: TaskDefinition) => {
    if (currentUser?.role !== 'Manager') return;
    setTasks(prev => [...prev, newTask]);
  };

  const handleAddUser = (userData: Omit<User, 'id'>) => {
    if (currentUser?.role !== 'Manager') return;
    const newUser: User = {
      id: `u-${Date.now()}`,
      ...userData
    };
    setUsers(prev => [...prev, newUser]);
  };

  const handleEditUser = (updatedUser: User) => {
    if (currentUser?.role !== 'Manager') return;
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser?.role !== 'Manager') return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const clearFilter = () => setActiveFilter(null);

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

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <h1 className="text-xl font-bold text-indigo-700 tracking-tight">Chrono<span className="text-slate-700">Guard</span></h1>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
             <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'DASHBOARD' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} 
            onClick={() => { setView('DASHBOARD'); clearFilter(); }}
          >
            <Home className="w-5 h-5" />
            {isSidebarOpen && <span>Dashboard</span>}
          </button>
          
          {currentUser.role === 'Manager' && (
            <div className="pt-2">
              <button 
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'USERS' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setView('USERS')}
              >
                <Users className="w-5 h-5" />
                {isSidebarOpen && <span>Team Members</span>}
              </button>
            </div>
          )}
        </nav>
        
        {isSidebarOpen && currentUser.role === 'Manager' && view === 'DASHBOARD' && (
          <div className="p-4 m-4 bg-indigo-900 rounded-xl text-white">
            <p className="text-xs font-medium text-indigo-200 uppercase mb-2">Dev Tools</p>
            <button 
              onClick={handleGenerateData} 
              disabled={isAnalyzing}
              className="w-full bg-white text-indigo-900 text-xs font-bold py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Generate Mock Data
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex flex-col gap-1">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               {view === 'DASHBOARD' 
                 ? (currentUser?.role === 'Manager' ? "Team Dashboard" : "My Dashboard")
                 : "User Management"
               }
             </h2>
             
             {/* Date Filters Toolbar (Dashboard Only) */}
             {view === 'DASHBOARD' && (
               <div className="flex items-center gap-3">
                 <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    {(['WEEK', 'MONTH', 'RANGE'] as DateFilterMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setDateFilterMode(mode)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${dateFilterMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {mode === 'WEEK' ? 'Week' : mode === 'MONTH' ? 'Month' : 'Custom'}
                      </button>
                    ))}
                 </div>

                 <div className="h-4 w-px bg-slate-200"></div>

                 {dateFilterMode !== 'RANGE' ? (
                   <div className="flex items-center gap-2">
                      <button 
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                        onClick={handlePrevDate}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
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
                   <div className="flex items-center gap-2">
                     <input 
                       type="date" 
                       value={customRange.start} 
                       onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))}
                       className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                     <span className="text-slate-400">-</span>
                     <input 
                       type="date" 
                       value={customRange.end} 
                       onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))}
                       className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                   </div>
                 )}
               </div>
             )}
          </div>

          <div className="flex items-center space-x-4">
             {currentUser.role === 'Manager' && view === 'DASHBOARD' && (
               <button 
                  onClick={() => setProjectModalOpen(true)}
                  className="flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span className="hidden sm:inline">New Project</span>
                </button>
             )}
             <button 
                onClick={() => setLogModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Time</span>
              </button>
             
             <div className="h-8 w-px bg-slate-200 mx-2"></div>

             <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">{currentUser.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm">
                  {currentUser.name.charAt(0)}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
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
                {/* Active Filter Banner */}
                {activeFilter && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                          <Filter className="w-4 h-4" />
                      </div>
                      <div>
                          <p className="text-sm font-bold text-indigo-900">
                            Filtered by {activeFilter.type === 'CATEGORY' ? 'Category' : 'Project'}: <span className="font-normal">{activeFilter.value}</span>
                          </p>
                          <p className="text-xs text-indigo-600">Showing entries within current date selection</p>
                      </div>
                    </div>
                    <button 
                        onClick={clearFilter}
                        className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4" />
                        <span>Clear Filter</span>
                    </button>
                  </div>
                )}

                {/* Row 1: High Level Stats (KPIS) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <StatsCard 
                    title="View Efficiency" 
                    value={analysis ? `${analysis.efficiencyScore}%` : "85%"} 
                    trend="AI Estimate"
                    trendUp={true}
                    icon={PieChart} 
                    color="text-emerald-600 bg-emerald-100" 
                  />
                </div>

                {/* Row 2: Charts (Contextual to Filter) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gantt Chart */}
                  <div className="lg:col-span-2">
                    <GanttChart 
                      entries={filteredEntries} 
                      allEntries={entries}
                      startDate={ganttProps.startDate}
                      daysToShow={ganttProps.daysToShow}
                      onTaskClick={(name) => setActiveFilter({ type: 'TASK_NAME', value: name })} 
                    />
                  </div>
                  <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-1 flex-shrink-0">Distribution</h3>
                      <p className="text-xs text-slate-400 mb-4">Based on current date selection</p>
                      <div className="flex-1 min-h-0">
                        {viewStats.taskData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={viewStats.taskData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                onClick={(data) => setActiveFilter({ type: 'CATEGORY', value: data.name })}
                                className="cursor-pointer outline-none"
                              >
                                {viewStats.taskData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36}/>
                            </RePieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                            No data for distribution
                          </div>
                        )}
                      </div>
                  </div>
                </div>

                {/* Row 3: Recent Activity & AI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
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
                        onTaskClick={(name) => setActiveFilter({ type: 'TASK_NAME', value: name })} 
                        onEdit={handleEditEntry}
                        showUserColumn={currentUser.role === 'Manager'}
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <AIAnalysisPanel 
                          analysis={analysis} 
                          isLoading={isAnalyzing} 
                          onAnalyze={handleAnalyze} 
                        />
                    </div>
                </div>
            </div>
          )}
        </div>
      </main>

      <LogTimeModal 
        isOpen={isLogModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveEntry}
        initialDate={getLocalDateStr(currentDate)}
        availableTasks={entries}
        taskOptions={tasks}
        entryToEdit={editingEntry}
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