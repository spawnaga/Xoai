-- Initialize Xoai Database
-- This script runs when the MySQL container starts for the first time

-- Create the main database (if not exists)
CREATE DATABASE IF NOT EXISTS xoai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a test database for running tests
CREATE DATABASE IF NOT EXISTS xoai_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions
GRANT ALL PRIVILEGES ON xoai.* TO 'xoai_user'@'%';
GRANT ALL PRIVILEGES ON xoai_test.* TO 'xoai_user'@'%';
FLUSH PRIVILEGES;

-- Use the main database
USE xoai;

-- Log initialization
SELECT 'Xoai database initialized successfully!' AS message;
