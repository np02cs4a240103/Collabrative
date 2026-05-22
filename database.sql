-- CREATE DATABASE
CREATE DATABASE unisolve;
USE unisolve;

-- 1. DEPARTMENTS TABLE
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin','Staff','Student') DEFAULT 'Student',
    department_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_approved TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);

-- 3. TICKETS TABLE
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    user_id INT NOT NULL,
    department_id INT NOT NULL,

    priority ENUM('Low','Medium','High') DEFAULT 'Low',
    status ENUM('notstarted','started','process','solved','closed') DEFAULT 'notstarted',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE
);

-- 4. MESSAGES TABLE
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);


-- 4. INSERT DEFAULT DEPARTMENTS
INSERT INTO departments (name) VALUES
('IT Support'),
('Administration'),
('Finance'),
('Library'),
('Examination');

-- 5. INDEXES (PERFORMANCE BOOST)
CREATE INDEX idx_user_id ON tickets(user_id);
CREATE INDEX idx_department_id ON tickets(department_id);
CREATE INDEX idx_status ON tickets(status);

-- 6. ADMIN USER (is_approved = 1 so admin can login immediately)
INSERT INTO users (name, email, password, role, is_approved)
VALUES (
    'Admin',
    'admin@uni.com',
    '$2y$10$7/dJUibVkOFY5JwkigFbLurPBLDMIG1mb.POK9DHLka6JodlbugsG',
    'Admin',
    1
);

-- ================================================
-- MIGRATION: Run this on existing databases
-- ================================================
-- ALTER TABLE users ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
-- UPDATE users SET is_approved = 1;