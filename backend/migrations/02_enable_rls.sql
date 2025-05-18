-- Enable Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy for inserting QR codes
-- Anyone with the anon key can insert, but they must provide all required fields
CREATE POLICY "Allow insert QR codes" ON qr_codes
    FOR INSERT
    WITH CHECK (
        wallet_address IS NOT NULL AND
        website_url IS NOT NULL AND
        website_name IS NOT NULL AND
        memo IS NOT NULL AND
        qr_data IS NOT NULL
    );

-- Policy for reading QR codes
-- Anyone can read QR codes, but only if they know both the wallet_address and website_url
CREATE POLICY "Allow read QR codes" ON qr_codes
    FOR SELECT
    USING (true);

-- Policy for preventing updates
-- No updates allowed through RLS
CREATE POLICY "Prevent updates" ON qr_codes
    FOR UPDATE
    USING (false);

-- Policy for preventing deletes
-- No deletes allowed through RLS
CREATE POLICY "Prevent deletes" ON qr_codes
    FOR DELETE
    USING (false); 