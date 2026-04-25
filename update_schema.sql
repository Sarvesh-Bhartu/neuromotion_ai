-- Update daily_plans to support clinical metadata
ALTER TABLE daily_plans 
ADD COLUMN IF NOT EXISTS hold_time INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS intensity TEXT DEFAULT 'Moderate';

-- Clear existing plans if you want a fresh start, otherwise don't run this.
-- TRUNCATE daily_plans;
-- TRUNCATE sessions;
