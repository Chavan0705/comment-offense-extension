CREATE DATABASE IF NOT EXISTS comment_offense_db;

USE comment_offense_db;

CREATE TABLE IF NOT EXISTS comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comment_text TEXT NOT NULL,
    website VARCHAR(100) NOT NULL,
    toxicity_score DOUBLE NOT NULL,
    label VARCHAR(50) NOT NULL,
    confidence DOUBLE NOT NULL,
    insult_score DOUBLE,
    threat_score DOUBLE,
    hate_score DOUBLE,
    spam_score DOUBLE,
    explanation TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
