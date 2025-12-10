
import { TimesheetEntry, TaskDefinition, User } from '../types';

declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

let db: any = null;
const DB_KEY = 'chrono_guard_sqlite_db_v7'; // Version bumped for Schema Change (Status moved to Task)

// --- Seed Data Generators ---

const getLocalDateStr = (d: Date) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const SEED_USERS: User[] = [
  { id: 'm1', username: 'admin', name: 'Sarah Manager', role: 'Manager' },
  { id: 'u1', username: 'alex', name: 'Alex Dev', role: 'Employee' },
  { id: 'u2', username: 'jane', name: 'Jane Designer', role: 'Employee' },
];

const SEED_TASKS: TaskDefinition[] = [
  { id: 'PROJ-101', name: 'PROJ-101: Authentication System', estimatedHours: 40, dueDate: getLocalDateStr(new Date(new Date().setDate(new Date().getDate() + 5))), status: 'InProgress' }, // Due in 5 days
  { id: 'PROJ-102', name: 'PROJ-102: Dashboard Analytics', estimatedHours: 20, dueDate: getLocalDateStr(new Date(new Date().setDate(new Date().getDate() - 2))), status: 'InProgress' }, // Overdue by 2 days
  { id: 'PROJ-103', name: 'PROJ-103: User Profile Settings', estimatedHours: 15, status: 'Done' },
  { id: 'PROJ-104', name: 'PROJ-104: API Rate Limiting', estimatedHours: 10, dueDate: getLocalDateStr(new Date(new Date().setDate(new Date().getDate() + 10))), status: 'ToDo' },
  { id: 'PROJ-105', name: 'PROJ-105: Mobile Responsive Layout', estimatedHours: 25, status: 'Done' },
  { id: 'MAINT-001', name: 'MAINT-001: Legacy Code Refactoring', status: 'InProgress' },
  { id: 'BUG-204', name: 'BUG-204: Fix Login Timeout', estimatedHours: 5, dueDate: getLocalDateStr(new Date()), status: 'ToDo' }, // Due Today
  { id: 'INT-001', name: 'INT-001: Weekly Team Sync', status: 'InProgress' }, // No limit
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

  return [
    { id: '1', userId: 'u1', userName: 'Alex Dev', date: getDateStr(0), startTime: '09:00', endTime: '12:00', durationHours: 3, taskName: 'PROJ-101: Authentication System', taskCategory: 'Development', description: 'Implemented login flow', managerComment: 'Good work on the flow.' },
    { id: '2', userId: 'u1', userName: 'Alex Dev', date: getDateStr(0), startTime: '13:00', endTime: '17:00', durationHours: 4, taskName: 'PROJ-103: User Profile Settings', taskCategory: 'Development', description: 'Refactored user service' },
    { id: '3', userId: 'u1', userName: 'Alex Dev', date: getDateStr(1), startTime: '10:00', endTime: '11:00', durationHours: 1, taskName: 'INT-001: Weekly Team Sync', taskCategory: 'Meeting', description: 'Daily standup' },
    { id: '4', userId: 'u1', userName: 'Alex Dev', date: getDateStr(1), startTime: '11:00', endTime: '18:00', durationHours: 7, taskName: 'PROJ-102: Dashboard Analytics', taskCategory: 'Design', description: 'UI mockups for dashboard' },
    { id: '5', userId: 'u1', userName: 'Alex Dev', date: getDateStr(2), startTime: '09:00', endTime: '15:00', durationHours: 6, taskName: 'PROJ-102: Dashboard Analytics', taskCategory: 'Development', description: 'API integration' },
    { id: '6', userId: 'u1', userName: 'Alex Dev', date: getDateStr(2), startTime: '15:00', endTime: '17:00', durationHours: 2, taskName: 'PROJ-104: API Rate Limiting', taskCategory: 'Testing', description: 'Unit tests for API' },
    
    { id: '7', userId: 'u2', userName: 'Jane Designer', date: getDateStr(0), startTime: '10:00', endTime: '16:00', durationHours: 6, taskName: 'PROJ-105: Mobile Responsive Layout', taskCategory: 'Design', description: 'High fidelity mobile mocks' },
    { id: '8', userId: 'u2', userName: 'Jane Designer', date: getDateStr(1), startTime: '09:00', endTime: '12:00', durationHours: 3, taskName: 'INT-001: Weekly Team Sync', taskCategory: 'Meeting', description: 'Sync with Devs' },
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
    // Use CDN for the WASM file to ensure it loads without local file setup
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
        dueDate TEXT,
        status TEXT
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
    dueDate: row[3],
    status: row[4]
  }));
};

export const addTask = (task: TaskDefinition) => {
  db.run("INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?, ?)", [task.id, task.name, task.estimatedHours || null, task.dueDate || null, task.status || 'ToDo']);
  saveToStorage();
};

export const deleteTask = (id: string) => {
  db.run("DELETE FROM tasks WHERE id = ?", [id]);
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
    managerComment: row[10] || ''
  }));
};

export const addTimesheetEntry = (entry: TimesheetEntry) => {
  db.run(`INSERT OR REPLACE INTO timesheets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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

// --- Import / Export ---

export const exportDatabaseSQL = (): string => {
  if (!db) return '';
  let sqlScript = "-- ChronoGuard DB Export\n-- Date: " + new Date().toISOString() + "\n\n";
  const tables = ['users', 'tasks', 'timesheets'];

  // 1. Get Schema
  const schemaRes = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (schemaRes.length > 0) {
    schemaRes[0].values.forEach((row: any) => {
      sqlScript += row[0] + ";\n\n";
    });
  }

  // 2. Get Data
  tables.forEach(table => {
    try {
      const res = db.exec(`SELECT * FROM ${table}`);
      if (res.length > 0) {
        const columns = res[0].columns;
        const values = res[0].values;

        sqlScript += `-- Data for ${table}\n`;
        values.forEach((row: any[]) => {
          const valueStr = row.map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`; // Escape single quotes
            return v;
          }).join(", ");
          sqlScript += `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${valueStr});\n`;
        });
        sqlScript += "\n";
      }
    } catch (e) {
      console.warn(`Could not export data for table ${table}`, e);
    }
  });

  return sqlScript;
};

export const importDatabaseSQL = (sqlScript: string) => {
  if (!db) return;
  const tables = ['users', 'tasks', 'timesheets'];
  
  try {
    // 1. Clear existing data
    tables.forEach(t => db.run(`DROP TABLE IF EXISTS ${t}`));

    // 2. Run Script
    // sql.js exec runs multiple statements
    db.exec(sqlScript);
    
    // 3. Save
    saveToStorage();
    return true;
  } catch (error) {
    console.error("Import Failed:", error);
    throw error;
  }
};
