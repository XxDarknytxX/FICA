-- src/config/schema.sql

-- Core users table for auth
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Placeholder for future domain entities (ship ticketing)
-- CREATE TABLE IF NOT EXISTS vessels (...);
-- CREATE TABLE IF NOT EXISTS ports (...);
-- CREATE TABLE IF NOT EXISTS sailings (...);
-- CREATE TABLE IF NOT EXISTS tickets (...);
