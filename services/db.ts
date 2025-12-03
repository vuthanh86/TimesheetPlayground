
import { TimesheetEntry, TaskDefinition, User } from '../types';

declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

let db: any = null;
const DB_KEY = 'chrono_guard_sqlite_db_v6'; // Version bumped for Status change (New, InProgress, Done)

// --- Seed Data Generators ---

const getLocalDateStr = (d: Date) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const SEED_USERS: User[] = [
  { id: 'm1', username: 'admin', name: 'Luu Tran', role: 'Manager' },
  { id: 'u1', username: 'user', name: 'Thanh Vu', role: 'Employee' },
];

const SEED_TASKS: TaskDefinition[] = [
  { id: 'PMI-EPIC 9', name: 'Task 25349: Implement Migration WCF HttpExternalHost project to WebAPI .NET8', estimatedHours: 36.5 },
];

const generateSeedEntries = (): TimesheetEntry[] => {
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
  if (db) {
    return getTimesheets();
  }
  return [
    { id: '1', userId: 'u1', userName: 'Thanh Vu', date: getDateStr(0), startTime: '10:00', endTime: '16:00', durationHours: 6, taskName: 'PROJ-105: Mobile Responsive Layout', taskCategory: 'Design', description: 'High fidelity mobile mocks', status: 'Done' },
  ];
};

// --- Database Operations ---

const saveToStorage = () => {
  if (!db) return;
  const data = db.export();
  const binary = new Uint8Array(data);
  let str = '';
  // Chunking to avoid stack overflow with String.fromCharCode.apply
  for (let i = 0; i < binary.length; i++) {
    str += String.fromCharCode(binary[i]);
  }
  localStorage.setItem(DB_KEY, btoa(str));
};

export const initDB = async (): Promise<void> => {
  if (db) return;

  if (typeof window.initSqlJs !== 'function') {
    console.error("SQL.js script not loaded.");
    return;
  }

  const SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  const savedDb = localStorage.getItem(DB_KEY);
  
  if (savedDb) {
    const binaryStr = atob(savedDb);
    const binary = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      binary[i] = binaryStr.charCodeAt(i);
    }
    db = new SQL.Database(binary);
  } else {
    db = new SQL.Database();
    // Create Tables
    db.run(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        role TEXT,
        avatar TEXT
      );
    `);
    db.run(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        name TEXT,
        estimatedHours REAL,
        dueDate TEXT
      );
    `);
    db.run(`
      CREATE TABLE timesheets (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userName TEXT,
        date TEXT,
        startTime TEXT,
        endTime TEXT,
        durationHours REAL,
        taskName TEXT,
        taskCategory TEXT,
        description TEXT,
        status TEXT,
        managerComment TEXT
      );
    `);
    
    // Seed Data
    SEED_USERS.forEach(u => addUser(u));
    SEED_TASKS.forEach(t => addTask(t));
    generateSeedEntries().forEach(e => addTimesheetEntry(e));
    
    saveToStorage();
  }
};

// --- CRUD Helpers ---

export const getUsers = (): User[] => {
  if (!db) return [];
  const res = db.exec("SELECT * FROM users");
  if (res.length === 0) return [];
  
  return res[0].values.map((row: any[]) => ({
    id: row[0],
    username: row[1],
    name: row[2],
    role: row[3],
    avatar: row[4]
  }));
};

export const addUser = (user: User) => {
  db.run("INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?, ?)", [user.id, user.username, user.name, user.role, user.avatar || null]);
  saveToStorage();
};

export const updateUser = (user: User) => {
  addUser(user); 
};

export const deleteUser = (id: string) => {
  db.run("DELETE FROM users WHERE id = ?", [id]);
  saveToStorage();
};

export const getTasks = (): TaskDefinition[] => {
  if (!db) return [];
  const res = db.exec("SELECT * FROM tasks");
  if (res.length === 0) return [];
  return res[0].values.map((row: any[]) => ({
    id: row[0],
    name: row[1],
    estimatedHours: row[2],
    dueDate: row[3]
  }));
};

export const addTask = (task: TaskDefinition) => {
  db.run("INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?)", [task.id, task.name, task.estimatedHours || null, task.dueDate || null]);
  saveToStorage();
};

export const getTimesheets = (): TimesheetEntry[] => {
  if (!db) return [];
  const res = db.exec("SELECT * FROM timesheets");
  if (res.length === 0) return [];
  
  return res[0].values.map((row: any[]) => ({
    id: row[0],
    userId: row[1],
    userName: row[2],
    date: row[3],
    startTime: row[4],
    endTime: row[5],
    durationHours: row[6],
    taskName: row[7],
    taskCategory: row[8],
    description: row[9],
    status: row[10],
    managerComment: row[11] || ''
  }));
};

export const addTimesheetEntry = (entry: TimesheetEntry) => {
  db.run(`INSERT OR REPLACE INTO timesheets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    entry.id,
    entry.userId,
    entry.userName,
    entry.date,
    entry.startTime,
    entry.endTime,
    entry.durationHours,
    entry.taskName,
    entry.taskCategory,
    entry.description,
    entry.status,
    entry.managerComment || ''
  ]);
  saveToStorage();
};

export const updateTimesheetEntry = (entry: TimesheetEntry) => {
  addTimesheetEntry(entry);
};

export const deleteTimesheetEntry = (id: string) => {
  db.run("DELETE FROM timesheets WHERE id = ?", [id]);
  saveToStorage();
};
