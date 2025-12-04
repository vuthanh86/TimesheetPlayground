-- ChronoGuard DB Export
-- Date: 2025-12-04T16:28:29.671Z

CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        role TEXT,
        avatar TEXT
      );

CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        name TEXT,
        estimatedHours REAL,
        dueDate TEXT,
        status TEXT
      );

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

-- Data for users
INSERT INTO users (id, username, name, role, avatar) VALUES ('m1', 'admin', 'Sarah Manager', 'Manager', NULL);
INSERT INTO users (id, username, name, role, avatar) VALUES ('u1', 'user', 'Thanh Vu', 'Employee', NULL);

-- Data for tasks
INSERT INTO tasks (id, name, estimatedHours, dueDate, status) VALUES ('PMI', 'Task 25349: Implement Migration WCF HttpExternalHost project to WebAPI .NET8', 36.5, '2025-12-31', 'InProgress');


-- Data for timesheets
INSERT INTO timesheets (id, userId, userName, date, startTime, endTime, durationHours, taskName, taskCategory, description, managerComment) VALUES ('1', 'u1', 'Thanh Vu', '2025-12-01', '09:00', '11:20', 2.2, 'Task 25349: Implement Migration WCF HttpExternalHost project to WebAPI .NET8', 'Development', 'Implemented project structure', '');
INSERT INTO timesheets (id, userId, userName, date, startTime, endTime, durationHours, taskName, taskCategory, description, managerComment) VALUES ('2', 'u1', 'Thanh Vu', '2025-12-02', '13:00', '16:00', 3, 'Task 25349: Implement Migration WCF HttpExternalHost project to WebAPI .NET8', 'Development', 'Implement middleware', '');
INSERT INTO timesheets (id, userId, userName, date, startTime, endTime, durationHours, taskName, taskCategory, description, managerComment) VALUES ('3', 'u1', 'Thanh Vu', '2025-12-03', '10:00', '17:00', 7, 'Task 25349: Implement Migration WCF HttpExternalHost project to WebAPI .NET8', 'Development', 'Implement security', '');
INSERT INTO timesheets (id, userId, userName, date, startTime, endTime, durationHours, taskName, taskCategory, description, managerComment) VALUES ('4', 'u1', 'Thanh Vu', '2025-12-04', '11:00', '16:30', 5.30, 'Task 25349: Implement Migration WCF HttpExternalHost project to WebAPI .NET8', 'Development', 'Migration service', '');
