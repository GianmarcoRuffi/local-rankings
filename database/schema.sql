-- Local Rankings Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS local_rankings
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE local_rankings;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stages (tappe) table
CREATE TABLE IF NOT EXISTS stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  date DATE NULL,
  pdf_filename VARCHAR(255) NULL,
  status ENUM('pending', 'active', 'merged') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stage ranking (classifica temporanea di tappa)
CREATE TABLE IF NOT EXISTS stage_ranking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stage_id INT NOT NULL,
  position INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  score DECIMAL(10,3) NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  t1 INT DEFAULT 0,
  presenze INT NOT NULL DEFAULT 1,
  raw_data TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
  INDEX idx_stage_id (stage_id),
  INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- General ranking (classifica generale cumulativa)
CREATE TABLE IF NOT EXISTS general_ranking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position INT DEFAULT 0,
  name VARCHAR(200) NOT NULL UNIQUE,
  total_points INT NOT NULL DEFAULT 0,
  t1 INT DEFAULT 0,
  presenze INT NOT NULL DEFAULT 0,
  stages_played INT NOT NULL DEFAULT 0,
  best_results TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_total_points (total_points DESC),
  INDEX idx_name (name),
  INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
