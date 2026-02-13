
-- Airtime Networks table
CREATE TABLE public.airtime_networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  commission_rate NUMERIC NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.airtime_networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view networks" ON public.airtime_networks
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admin can manage networks" ON public.airtime_networks
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Only admin can update networks" ON public.airtime_networks
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Only admin can delete networks" ON public.airtime_networks
  FOR DELETE USING (public.is_admin());

-- Airtime Transactions table
CREATE TABLE public.airtime_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL DEFAULT ('ATX-' || substr(gen_random_uuid()::text, 1, 12)),
  user_id UUID NOT NULL,
  network_id UUID NOT NULL REFERENCES public.airtime_networks(id),
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0.00,
  commission NUMERIC NOT NULL DEFAULT 0.00,
  agent_id UUID REFERENCES public.agents(id),
  type TEXT NOT NULL DEFAULT 'purchase',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.airtime_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own airtime txns" ON public.airtime_transactions
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_agent_or_admin()
  );
CREATE POLICY "System inserts airtime txns" ON public.airtime_transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admin can update airtime txns" ON public.airtime_transactions
  FOR UPDATE USING (public.is_admin());

-- Currencies table
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view currencies" ON public.currencies
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admin can manage currencies" ON public.currencies
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Only admin can update currencies" ON public.currencies
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Only admin can delete currencies" ON public.currencies
  FOR DELETE USING (public.is_admin());

-- System Settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings" ON public.system_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admin can manage settings" ON public.system_settings
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Only admin can update settings" ON public.system_settings
  FOR UPDATE USING (public.is_admin());

-- Seed default currency
INSERT INTO public.currencies (code, name, symbol, is_default) VALUES ('KES', 'Kenyan Shilling', 'KES', true);

-- Seed airtime networks
INSERT INTO public.airtime_networks (name, code, commission_rate) VALUES 
  ('Safaricom', 'SAF', 3.00),
  ('Airtel', 'AIR', 3.50),
  ('Telkom', 'TEL', 4.00);

-- Seed default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('sms_fee', '"0.40"', 'SMS notification fee per message in default currency'),
  ('statement_fee', '"50.00"', 'Statement download fee in default currency'),
  ('kyc_required', 'true', 'Whether KYC approval is required for transactions'),
  ('default_currency', '"KES"', 'Default system currency code');

-- Add updated_at triggers
CREATE TRIGGER update_airtime_networks_updated_at BEFORE UPDATE ON public.airtime_networks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
