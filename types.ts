
export type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

export interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  taskName: string; // e.g., 'PROJ-101: Login Page'
  taskCategory: string; // e.g., 'Development', 'Meeting', 'Design'
  description: string;
  managerComment?: string; // Feedback from manager
}

export interface TaskDefinition {
  id: string; // e.g. PROJ-101
  name: string; // e.g. "PROJ-101: Authentication System"
  estimatedHours?: number; // Estimated/Max hours for this task
  dueDate?: string; // YYYY-MM-DD
  status: TaskStatus;
}

export interface AIAnalysisResult {
  summary: string;
  efficiencyScore: number;
  burnoutRisk: 'Low' | 'Medium' | 'High';
  keyInsights: string[];
}

export type UserRole = 'Manager' | 'Employee';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
}
