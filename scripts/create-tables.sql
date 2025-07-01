-- Create earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(date);
CREATE INDEX IF NOT EXISTS idx_earnings_platform ON earnings(platform);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Enable Row Level Security
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on earnings" ON earnings FOR ALL USING (true);
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true);
