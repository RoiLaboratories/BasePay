-- First, enable RLS on the table
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON qr_codes;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON qr_codes;
DROP POLICY IF EXISTS "Prevent all updates" ON qr_codes;
DROP POLICY IF EXISTS "Prevent all deletions" ON qr_codes;

-- Create policy to allow service role to read QR codes
CREATE POLICY "Allow service role read access" ON qr_codes
    FOR SELECT
    TO service_role
    USING (true);

-- Create policy to allow service role to insert QR codes
CREATE POLICY "Allow service role insert" ON qr_codes
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create policy to allow service role to update QR codes
CREATE POLICY "Allow service role update" ON qr_codes
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policy to allow service role to delete QR codes
CREATE POLICY "Allow service role delete" ON qr_codes
    FOR DELETE
    TO service_role
    USING (true); 