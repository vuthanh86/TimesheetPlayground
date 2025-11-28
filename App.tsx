
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  PieChart, 
  Users, 
  Settings, 
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
  LogOut
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { TimesheetEntry, ViewMode, AIAnalysisResult, TaskDefinition, User } from './types';
import StatsCard from './components/StatsCard';
import TimesheetTable from './components/TimesheetTable';
import AIAnalysisPanel from './components/AIAnalysisPanel';
import LogTimeModal from './components/LogTimeModal';
import AddProjectModal from './components/AddProjectModal';
import LoginScreen from './components/LoginScreen';
import GanttChart from './components/GanttChart';
import { analyzeTimesheetData, generateMockTimesheets } from './services/geminiService';

// Constants
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b'];

const MOCK_USERS: User[] = [
  { id: 'm1', username: 'admin', name: 'Sarah Manager', role: 'Manager' },
  { id: 'u1', username: 'alex', name: 'Alex Dev', role: 'Employee' },
  { id: 'u2', username: 'jane', name: 'Jane Designer', role: 'Employee' },
];

const INITIAL_DATA: TimesheetEntry[] = [
  // Alex's Entries
  { id: '1', userId: 'u1', userName: 'Alex Dev', date: '2023-10-23', startTime: '09:00', endTime: '12:00', durationHours: 3, taskName: 'PROJ-101: Authentication System', taskCategory: 'Development', description: 'Implemented login flow', status: 'Approved' },
  { id: '2', userId: 'u1', userName: 'Alex Dev', date: '2023-10-23', startTime: '13:00', endTime: '17:00', durationHours: 4, taskName: 'PROJ-103: User Profile Settings', taskCategory: 'Development', description: 'Refactored user service', status: 'Approved', dependencies: ['1'] },
  { id: '3', userId: 'u1', userName: 'Alex Dev', date: '2023-10-24', startTime: '10:00', endTime: '11:00', durationHours: 1, taskName: 'INT-001: Weekly Team Sync', taskCategory: 'Meeting', description: 'Daily standup', status: 'Approved' },
  { id: '4', userId: 'u1', userName: 'Alex Dev', date: '2023-10-24', startTime: '11:00', endTime: '18:00', durationHours: 7, taskName: 'PROJ-102: Dashboard Analytics', taskCategory: 'Design', description: 'UI mockups for dashboard', status: 'Pending' },
  { id: '5', userId: 'u1', userName: 'Alex Dev', date: '2023-10-25', startTime: '09:00', endTime: '15:00', durationHours: 6, taskName: 'PROJ-102: Dashboard Analytics', taskCategory: 'Development', description: 'API integration', status: 'Approved', dependencies: ['2'] },
  { id: '6', userId: 'u1', userName: 'Alex Dev', date: '2023-10-25', startTime: '15:00', endTime: '17:00', durationHours: 2, taskName: 'PROJ-104: API Rate Limiting', taskCategory: 'Testing', description: 'Unit tests for API', status: 'Pending', dependencies: ['5'] },
  
  // Jane's Entries (for multi-user testing)
  { id: '7', userId: 'u2', userName: 'Jane Designer', date: '2023-10-23', startTime: '10:00', endTime: '16:00', durationHours: 6, taskName: 'PROJ-105: Mobile Responsive Layout', taskCategory: 'Design', description: 'High fidelity mobile mocks', status: 'Approved' },
  { id: '8', userId: 'u2', userName: 'Jane Designer', date: '2023-10-24', startTime: '09:00', endTime: '12:00', durationHours: 3, taskName: 'INT-001: Weekly Team Sync', taskCategory: 'Meeting', description: 'Sync with Devs', status: 'Approved' },
];

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

function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [entries, setEntries] = useState<TimesheetEntry[]>(INITIAL_DATA);
  const [tasks, setTasks] = useState<TaskDefinition[]>(INITIAL_TASKS);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2023-10-23'));
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{ type: 'CATEGORY' | 'TASK_NAME', value: string } | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  // Filter entries available to the current view (Manager sees all, Employee sees own)
  const accessibleEntries = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Manager') return entries;
    return entries.filter(e => e.userId === currentUser.id);
  }, [entries, currentUser]);

  // Helper to get week ranges
  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    // Adjust to Monday start (0 is Sunday)
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  // Global Dashboard Stats (Based on accessibleEntries)
  const dashboardStats = useMemo(() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const { start: weekStart, end: weekEnd } = getWeekRange(currentDate);
    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // 1. Daily Stats
    const dailyEntries = accessibleEntries.filter(e => e.date === dateStr);
    const dailyHours = dailyEntries.reduce((acc, curr) => acc + curr.durationHours, 0);

    // 2. Weekly Stats
    const weeklyEntries = accessibleEntries.filter(e => {
      const entryDate = new Date(e.date);
      // Simple date compare (string or object)
      // Resetting hours for accurate comparison
      const d = new Date(entryDate); d.setHours(0,0,0,0);
      const ws = new Date(weekStart); ws.setHours(0,0,0,0);
      const we = new Date(weekEnd); we.setHours(0,0,0,0);
      return d >= ws && d <= we;
    });
    const weeklyHours = weeklyEntries.reduce((acc, curr) => acc + curr.durationHours, 0);
    
    // Weekly Bar Data
    const dailyGroups: Record<string, number> = {};
    // Initialize week days
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
       dailyGroups[d.toISOString().split('T')[0]] = 0;
    }
    weeklyEntries.forEach(e => {
      dailyGroups[e.date] = (dailyGroups[e.date] || 0) + e.durationHours;
    });
    const weeklyBarData = Object.keys(dailyGroups).sort().map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate: date,
      hours: dailyGroups[date]
    }));

    // 3. Monthly Stats
    const monthlyEntries = accessibleEntries.filter(e => e.date.startsWith(monthStr));
    const monthlyHours = monthlyEntries.reduce((acc, curr) => acc + curr.durationHours, 0);

    // 4. Task Overview
    const taskGroups: Record<string, number> = {};
    monthlyEntries.forEach(e => {
      taskGroups[e.taskCategory] = (taskGroups[e.taskCategory] || 0) + e.durationHours;
    });
    const taskData = Object.keys(taskGroups).map(key => ({
      name: key,
      value: taskGroups[key]
    }));

    return {
      dailyHours,
      weeklyHours,
      monthlyHours,
      weeklyBarData,
      taskData,
      dailyEntries,
      weeklyEntries,
      monthlyEntries,
      weekStart
    };
  }, [accessibleEntries, currentDate]);

  // View Filtered Data
  const filteredEntries = useMemo(() => {
    if (!currentUser) return [];

    // Priority: Active Filter (Drill Down) overrides all other views
    if (activeFilter) {
      return accessibleEntries
        .filter(e => 
          activeFilter.type === 'CATEGORY' 
            ? e.taskCategory === activeFilter.value 
            : e.taskName === activeFilter.value
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const dateStr = currentDate.toISOString().split('T')[0];
    const { start: weekStart, end: weekEnd } = getWeekRange(currentDate);
    const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    switch (viewMode) {
      case ViewMode.DAILY:
        return accessibleEntries.filter(e => e.date === dateStr);
      case ViewMode.WEEK:
      case ViewMode.DASHBOARD: // Dashboard also uses weekly context for recent activity list if desired, but we usually show recent items.
        // For Dashboard list, let's show weekly items to match the Gantt chart context
        return accessibleEntries.filter(e => {
          const d = new Date(e.date);
          const ws = new Date(weekStart); ws.setHours(0,0,0,0);
          const we = new Date(weekEnd); we.setHours(0,0,0,0);
          return d >= ws && d <= we;
        });
      case ViewMode.MONTH:
      case ViewMode.TASK:
        return accessibleEntries.filter(e => e.date.startsWith(monthPrefix));
      default:
        return accessibleEntries;
    }
  }, [accessibleEntries, viewMode, currentDate, activeFilter, currentUser]);

  // Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Reset state on login
    setViewMode(ViewMode.DASHBOARD);
    setActiveFilter(null);
    setAnalysis(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Analyze filtered data (respecting user role)
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
    const newEntries = await generateMockTimesheets(currentDate.toISOString().split('T')[0], 5);
    if (newEntries.length > 0) {
      // Generated entries are mock, we assign them to the current "mock" user u1 for simplicity in this demo context
      setEntries(prev => [...prev, ...newEntries]);
    }
    setIsAnalyzing(false);
  };

  const handleSaveEntry = (entryData: Omit<TimesheetEntry, 'id' | 'userId' | 'userName' | 'status'>) => {
    if (!currentUser) return;

    if (editingEntry) {
      // Update existing entry
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? {
        ...e,
        ...entryData,
        status: 'Pending' // Reset status to Pending on edit
      } : e));
      setEditingEntry(null);
    } else {
      // Create new entry
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
    // RBAC: Employees can only edit their own entries. Managers can edit all.
    if (currentUser?.role !== 'Manager' && entry.userId !== currentUser?.id) {
       return; 
    }
    setEditingEntry(entry);
    setLogModalOpen(true);
  };

  const handleModalClose = () => {
    setLogModalOpen(false);
    setEditingEntry(null);
  };

  const handleAddProject = (newTask: TaskDefinition) => {
    // RBAC: Only Managers can add new projects
    if (currentUser?.role !== 'Manager') return;
    setTasks(prev => [...prev, newTask]);
  };

  const clearFilter = () => setActiveFilter(null);

  const formatDateRange = () => {
    if (activeFilter) {
      return "All History";
    }
    if (viewMode === ViewMode.DASHBOARD || viewMode === ViewMode.WEEK) {
       const { start, end } = getWeekRange(currentDate);
       const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
       const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
       return `${startStr} - ${endStr}`;
    }
    if (viewMode === ViewMode.DAILY) {
       return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getPageTitle = () => {
    if (activeFilter) return "Detailed Drill-Down";
    switch (viewMode) {
      case ViewMode.DASHBOARD: return currentUser?.role === 'Manager' ? "Team Dashboard" : "My Dashboard";
      case ViewMode.DAILY: return "Daily Overview";
      case ViewMode.WEEK: return "Weekly Schedule";
      case ViewMode.MONTH: return "Monthly Report";
      case ViewMode.TASK: return "Task Analytics";
      default: return "Timesheet";
    }
  };

  const handleNextDate = () => {
    if (activeFilter) return;
    const newDate = new Date(currentDate);
    if (viewMode === ViewMode.DASHBOARD || viewMode === ViewMode.WEEK) {
       newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === ViewMode.MONTH || viewMode === ViewMode.TASK) {
       newDate.setMonth(newDate.getMonth() + 1);
    } else {
       newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handlePrevDate = () => {
    if (activeFilter) return;
    const newDate = new Date(currentDate);
    if (viewMode === ViewMode.DASHBOARD || viewMode === ViewMode.WEEK) {
       newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === ViewMode.MONTH || viewMode === ViewMode.TASK) {
       newDate.setMonth(newDate.getMonth() - 1);
    } else {
       newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  // Login Screen Render
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={MOCK_USERS} />;
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
          <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewMode === ViewMode.DASHBOARD && !activeFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => { setViewMode(ViewMode.DASHBOARD); clearFilter(); }}>
            <Home className="w-5 h-5" />
            {isSidebarOpen && <span>Dashboard</span>}
          </button>
           <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewMode === ViewMode.DAILY && !activeFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => { setViewMode(ViewMode.DAILY); clearFilter(); }}>
            <Clock className="w-5 h-5" />
            {isSidebarOpen && <span>Daily Overview</span>}
          </button>
          <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewMode === ViewMode.WEEK && !activeFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => { setViewMode(ViewMode.WEEK); clearFilter(); }}>
            <LayoutDashboard className="w-5 h-5" />
            {isSidebarOpen && <span>Weekly Overview</span>}
          </button>
          <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewMode === ViewMode.MONTH && !activeFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => { setViewMode(ViewMode.MONTH); clearFilter(); }}>
            <CalendarDays className="w-5 h-5" />
            {isSidebarOpen && <span>Monthly Overview</span>}
          </button>
          <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${viewMode === ViewMode.TASK && !activeFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => { setViewMode(ViewMode.TASK); clearFilter(); }}>
            <Briefcase className="w-5 h-5" />
            {isSidebarOpen && <span>Task Overview</span>}
          </button>
          
          {currentUser.role === 'Manager' && (
            <div className="pt-8 mt-8 border-t border-slate-100">
              <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
                <Users className="w-5 h-5" />
                {isSidebarOpen && <span>Team Members</span>}
              </button>
            </div>
          )}
        </nav>
        
        {isSidebarOpen && currentUser.role === 'Manager' && (
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-800">
              {getPageTitle()}
            </h2>
            <div className="h-6 w-px bg-slate-300 mx-2"></div>
            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
              <button 
                className={`p-1 rounded-md shadow-sm transition-all ${activeFilter ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`} 
                onClick={handlePrevDate}
                disabled={!!activeFilter}
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-sm font-medium text-slate-600 px-2 min-w-[140px] text-center">
                {formatDateRange()}
              </span>
              <button 
                className={`p-1 rounded-md shadow-sm transition-all ${activeFilter ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`} 
                onClick={handleNextDate}
                disabled={!!activeFilter}
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             {currentUser.role === 'Manager' && (
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
          
          {/* Active Filter Banner */}
          {activeFilter && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-4">
               <div className="flex items-center space-x-3">
                 <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                    <Filter className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-indigo-900">
                       Filtered by {activeFilter.type === 'CATEGORY' ? 'Category' : 'Project'}: <span className="font-normal">{activeFilter.value}</span>
                    </p>
                    <p className="text-xs text-indigo-600">Showing all recorded history for this item</p>
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
          
          {/* DASHBOARD GRID */}
          {viewMode === ViewMode.DASHBOARD && !activeFilter && (
            <div className="space-y-6">
              {/* Row 1: High Level Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <StatsCard 
                  title="Daily Hours" 
                  value={`${dashboardStats.dailyHours.toFixed(1)}h`} 
                  trend={dashboardStats.dailyHours >= 8 ? "On Track" : "Below Goal"} 
                  trendUp={dashboardStats.dailyHours >= 8} 
                  icon={Clock} 
                  color="text-blue-600 bg-blue-100" 
                />
                <StatsCard 
                  title="Weekly Total" 
                  value={`${dashboardStats.weeklyHours.toFixed(1)}h`} 
                  trend="This Week"
                  trendUp={true} 
                  icon={CalendarDays} 
                  color="text-indigo-600 bg-indigo-100" 
                />
                 <StatsCard 
                  title="Monthly Total" 
                  value={`${dashboardStats.monthlyHours.toFixed(1)}h`} 
                  icon={Calendar} 
                  color="text-purple-600 bg-purple-100" 
                />
                <StatsCard 
                  title="Efficiency" 
                  value={analysis ? `${analysis.efficiencyScore}%` : "85%"} 
                  trend="AI Estimate"
                  trendUp={true}
                  icon={PieChart} 
                  color="text-emerald-600 bg-emerald-100" 
                />
              </div>

              {/* Row 2: Charts (Gantt & Task Distribution) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Replaced Bar Chart with Gantt Chart */}
                 <div className="lg:col-span-2">
                   <GanttChart 
                     entries={dashboardStats.weeklyEntries} 
                     startDate={dashboardStats.weekStart}
                     onTaskClick={(name) => setActiveFilter({ type: 'TASK_NAME', value: name })} 
                   />
                 </div>
                 <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[350px]">
                    <h3 className="font-bold text-slate-800 mb-4">Task Distribution (Month)</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <RePieChart>
                        <Pie
                          data={dashboardStats.taskData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          onClick={(data) => setActiveFilter({ type: 'CATEGORY', value: data.name })}
                          className="cursor-pointer outline-none"
                        >
                          {dashboardStats.taskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </RePieChart>
                    </ResponsiveContainer>
                 </div>
              </div>

               {/* Row 3: Recent Activity & AI */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-lg">
                        Recent Activity Log
                      </h3>
                    </div>
                    {/* Pass all entries for dependency checking */}
                    <TimesheetTable 
                      entries={filteredEntries.slice(0, 8)} 
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

          {/* OTHER VIEWS OR ACTIVE FILTER */}
          {(viewMode !== ViewMode.DASHBOARD || activeFilter) && (
            <>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatsCard 
                    title="Total Selected Hours" 
                    value={`${filteredEntries.reduce((acc, curr) => acc + curr.durationHours, 0).toFixed(1)}h`} 
                    icon={Clock} 
                    color="text-blue-600 bg-blue-100" 
                  />
                   <StatsCard 
                    title="Active Tasks" 
                    value={new Set(filteredEntries.map(e => e.taskCategory)).size} 
                    icon={Briefcase} 
                    color="text-purple-600 bg-purple-100" 
                  />
                  <StatsCard 
                    title="Total Entries" 
                    value={filteredEntries.length} 
                    icon={Calendar} 
                    color="text-indigo-600 bg-indigo-100" 
                  />
                  <StatsCard 
                    title="AI Efficiency" 
                    value={analysis ? `${analysis.efficiencyScore}%` : "N/A"} 
                    icon={PieChart} 
                    color="text-emerald-600 bg-emerald-100" 
                  />
               </div>

               {viewMode === ViewMode.WEEK && !activeFilter && (
                 <div className="mb-6">
                    <GanttChart 
                     entries={filteredEntries} 
                     startDate={getWeekRange(currentDate).start} 
                     onTaskClick={(name) => setActiveFilter({ type: 'TASK_NAME', value: name })}
                   />
                 </div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
                    <h3 className="font-bold text-slate-800 mb-4">Detailed Analytics</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      {viewMode === ViewMode.TASK || activeFilter ? (
                         <RePieChart>
                            <Pie
                              data={dashboardStats.taskData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={110}
                              paddingAngle={5}
                              dataKey="value"
                              onClick={(data) => setActiveFilter({ type: 'CATEGORY', value: data.name })}
                              className="cursor-pointer outline-none"
                            >
                              {dashboardStats.taskData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </RePieChart>
                      ) : (
                         <BarChart data={dashboardStats.weeklyBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div className="lg:col-span-1">
                    <AIAnalysisPanel 
                      analysis={analysis} 
                      isLoading={isAnalyzing} 
                      onAnalyze={handleAnalyze} 
                    />
                  </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-800 text-lg mb-4">
                   {activeFilter ? `History: ${activeFilter.value}` : 'Entries List'}
                 </h3>
                 <TimesheetTable 
                  entries={filteredEntries} 
                  allEntries={entries} 
                  onTaskClick={(name) => setActiveFilter({ type: 'TASK_NAME', value: name })} 
                  onEdit={handleEditEntry}
                  showUserColumn={currentUser.role === 'Manager'}
                 />
               </div>
            </>
          )}

        </div>
      </main>

      <LogTimeModal 
        isOpen={isLogModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveEntry}
        initialDate={currentDate.toISOString().split('T')[0]}
        availableTasks={entries} // Dependencies can be from anyone on the team ideally, or just accessible ones
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
