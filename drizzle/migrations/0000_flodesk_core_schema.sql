-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== profiles ==========
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  base_currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  session_times jsonb NOT NULL DEFAULT '{"Asia":{"start":"00:00","end":"07:00"},"London":{"start":"07:00","end":"12:00"},"New York":{"start":"12:00","end":"21:00"}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== trading_accounts ==========
CREATE TABLE public.trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  broker text,
  platform text NOT NULL DEFAULT 'MT5',
  mode text NOT NULL DEFAULT 'manual', -- manual | live_sync
  currency text NOT NULL DEFAULT 'USD',
  starting_balance numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  equity numeric NOT NULL DEFAULT 0,
  mt_login text,
  mt_server text,
  metaapi_account_id text,
  metaapi_region text,
  sync_status text NOT NULL DEFAULT 'manual', -- manual | pending | connected | error | not_configured
  sync_error text,
  last_synced_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.trading_accounts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_accounts TO authenticated;
GRANT ALL ON public.trading_accounts TO service_role;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts" ON public.trading_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== setups ==========
CREATE TABLE public.setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.setups(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setups TO authenticated;
GRANT ALL ON public.setups TO service_role;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own setups" ON public.setups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== trades ==========
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  external_deal_id text,
  symbol text NOT NULL,
  direction text NOT NULL DEFAULT 'long', -- long | short
  lots numeric NOT NULL DEFAULT 0,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'closed', -- open | closed
  pips numeric,
  pnl numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  swap numeric NOT NULL DEFAULT 0,
  risk_amount numeric,
  r_multiple numeric,
  setup_id uuid REFERENCES public.setups(id) ON DELETE SET NULL,
  session text,
  notes text,
  lessons text,
  source text NOT NULL DEFAULT 'manual', -- manual | sync | import | demo
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, external_deal_id)
);
CREATE INDEX ON public.trades(user_id, opened_at DESC);
CREATE INDEX ON public.trades(account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades" ON public.trades FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trades_updated BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== trade_screenshots ==========
CREATE TABLE public.trade_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  kind text NOT NULL DEFAULT 'before', -- before | after
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.trade_screenshots(trade_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_screenshots TO authenticated;
GRANT ALL ON public.trade_screenshots TO service_role;
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own screenshots" ON public.trade_screenshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== emotion_logs ==========
CREATE TABLE public.emotion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  phase text NOT NULL, -- before | during | after
  emotion text NOT NULL,
  intensity int NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, phase)
);
CREATE INDEX ON public.emotion_logs(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emotion_logs TO authenticated;
GRANT ALL ON public.emotion_logs TO service_role;
ALTER TABLE public.emotion_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emotions" ON public.emotion_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== guardrail_rules ==========
CREATE TABLE public.guardrail_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_risk_pct numeric NOT NULL DEFAULT 1,
  max_daily_loss_pct numeric NOT NULL DEFAULT 3,
  max_weekly_loss_pct numeric NOT NULL DEFAULT 6,
  max_trades_per_day int NOT NULL DEFAULT 3,
  max_consecutive_losses int NOT NULL DEFAULT 3,
  allowed_sessions text[] NOT NULL DEFAULT ARRAY['London','New York'],
  allowed_hours_start text,
  allowed_hours_end text,
  allowed_symbols text[] NOT NULL DEFAULT ARRAY[]::text[],
  news_window_minutes int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardrail_rules TO authenticated;
GRANT ALL ON public.guardrail_rules TO service_role;
ALTER TABLE public.guardrail_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guardrails" ON public.guardrail_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER guardrails_updated BEFORE UPDATE ON public.guardrail_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== news_events (user-entered high-impact news for the no-trade window) ==========
CREATE TABLE public.news_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  currency text,
  event_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.news_events(user_id, event_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_events TO authenticated;
GRANT ALL ON public.news_events TO service_role;
ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own news" ON public.news_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== rule_breaks ==========
CREATE TABLE public.rule_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rule text NOT NULL,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'auto', -- auto | manual
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.rule_breaks(trade_id);
CREATE INDEX ON public.rule_breaks(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rule_breaks TO authenticated;
GRANT ALL ON public.rule_breaks TO service_role;
ALTER TABLE public.rule_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rule breaks" ON public.rule_breaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== checklist ==========
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  strategy_rules text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.checklist_templates(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own templates" ON public.checklist_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.checklist_items(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.checklist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.trade_checklist_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  label text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.trade_checklist_results(trade_id);
CREATE INDEX ON public.trade_checklist_results(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_checklist_results TO authenticated;
GRANT ALL ON public.trade_checklist_results TO service_role;
ALTER TABLE public.trade_checklist_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checklist results" ON public.trade_checklist_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== daily_plans ==========
CREATE TABLE public.daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  biases jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_levels text,
  mindset int CHECK (mindset BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plans TO authenticated;
GRANT ALL ON public.daily_plans TO service_role;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.daily_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_plans_updated BEFORE UPDATE ON public.daily_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== AI ==========
CREATE TABLE public.ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  period_start date,
  period_end date,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_reports(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.ai_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL, -- user | assistant
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_messages(user_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.ai_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== symbol_settings ==========
CREATE TABLE public.symbol_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  category text NOT NULL DEFAULT 'fx', -- fx | fx_jpy | metal | index | crypto
  pip_size numeric NOT NULL,
  contract_size numeric NOT NULL,
  quote_currency text NOT NULL DEFAULT 'USD',
  pip_value_per_lot numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symbol_settings TO authenticated;
GRANT ALL ON public.symbol_settings TO service_role;
ALTER TABLE public.symbol_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own symbol settings" ON public.symbol_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== storage policies for screenshots ==========
CREATE POLICY "screenshots read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "screenshots insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "screenshots update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "screenshots delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========== default settings for a new user ==========
CREATE OR REPLACE FUNCTION public.seed_user_defaults(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tpl uuid;
BEGIN
  INSERT INTO setups(user_id, name, description) VALUES
    (_uid, 'OB Retest', 'Price returns to a fresh order block after MSS'),
    (_uid, 'Liquidity Sweep', 'Sweep of session high/low then reversal'),
    (_uid, 'BOS Continuation', 'Pullback entry after break of structure with HTF bias'),
    (_uid, 'London Breakout', 'Asia range breakout at London open');

  INSERT INTO checklist_templates(user_id, name, is_default, strategy_rules)
  VALUES (_uid, 'SMC Core', true,
    E'1. Trade only in the direction of the higher-timeframe bias.\n2. Wait for a liquidity sweep and a market structure shift on the entry timeframe.\n3. Enter on the first retest of the order block that caused the shift.\n4. Stop loss beyond the structure that created the order block.\n5. Minimum 1:2 reward-to-risk, partials at 1R optional.\n6. No entries 30 minutes either side of high-impact news.')
  RETURNING id INTO tpl;

  INSERT INTO checklist_items(user_id, template_id, label, position) VALUES
    (_uid, tpl, 'HTF bias identified', 1),
    (_uid, tpl, 'Market structure shift (MSS) confirmed', 2),
    (_uid, tpl, 'Break of structure (BOS) confirmed', 3),
    (_uid, tpl, 'Order block (OB) identified', 4),
    (_uid, tpl, 'Liquidity sweep taken', 5),
    (_uid, tpl, 'Entry inside OB', 6),
    (_uid, tpl, 'SL beyond structure', 7),
    (_uid, tpl, 'Minimum 1:2 R:R', 8),
    (_uid, tpl, 'No high-impact news within window', 9),
    (_uid, tpl, 'Within allowed session', 10);

  INSERT INTO guardrail_rules(user_id, allowed_symbols)
  VALUES (_uid, ARRAY['EURUSD','GBPUSD','XAUUSD','US30','NAS100'])
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO symbol_settings(user_id, symbol, category, pip_size, contract_size, quote_currency, pip_value_per_lot) VALUES
    (_uid,'EURUSD','fx',0.0001,100000,'USD',10),
    (_uid,'GBPUSD','fx',0.0001,100000,'USD',10),
    (_uid,'AUDUSD','fx',0.0001,100000,'USD',10),
    (_uid,'NZDUSD','fx',0.0001,100000,'USD',10),
    (_uid,'USDCAD','fx',0.0001,100000,'CAD',7.3),
    (_uid,'USDCHF','fx',0.0001,100000,'CHF',11.3),
    (_uid,'EURGBP','fx',0.0001,100000,'GBP',12.7),
    (_uid,'USDJPY','fx_jpy',0.01,100000,'JPY',6.6),
    (_uid,'EURJPY','fx_jpy',0.01,100000,'JPY',6.6),
    (_uid,'GBPJPY','fx_jpy',0.01,100000,'JPY',6.6),
    (_uid,'XAUUSD','metal',0.1,100,'USD',10),
    (_uid,'US30','index',1,1,'USD',1),
    (_uid,'NAS100','index',1,1,'USD',1),
    (_uid,'GER40','index',1,1,'EUR',1.08),
    (_uid,'BTCUSD','crypto',1,1,'USD',1)
  ON CONFLICT (user_id, symbol) DO NOTHING;
END; $$;

-- ========== demo data ==========
CREATE OR REPLACE FUNCTION public.seed_demo_data(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  acc_id uuid; tpl_id uuid; setup_ids uuid[]; t_id uuid;
  syms text[] := ARRAY['EURUSD','EURUSD','GBPUSD','GBPUSD','XAUUSD','XAUUSD','US30','NAS100','NAS100'];
  sym text; i int; d date; hr int; sess text; rv double precision;
  pip numeric; pv numeric; base numeric; dec int; sl_p numeric; lots numeric; risk_amt numeric;
  r numeric; dir text; sgn int; entry numeric; sl numeric; tp numeric; exitp numeric; pips numeric; pnl numeric;
  opened timestamptz; closed timestamptz; brk boolean; brk_kind int; win boolean; total numeric := 0;
  emo_good_b text[] := ARRAY['Calm','Confident','Focused'];
  emo_bad_b text[] := ARRAY['Anxious','FOMO','Impatient'];
  emo_good_d text[] := ARRAY['Patient','Calm','Focused'];
  emo_bad_d text[] := ARRAY['Nervous','Greedy','Fearful'];
  emo_good_a text[] := ARRAY['Satisfied','Relieved','Proud'];
  emo_bad_a text[] := ARRAY['Frustrated','Regretful','Angry'];
  win_notes text[] := ARRAY['Clean sweep of Asia low, MSS on M5, entered on OB retest.','Waited for the pullback into the OB. Let it run to target.','HTF bias aligned, partials at 1R then trailed.','Textbook BOS continuation off the London open.'];
  loss_notes text[] := ARRAY['Entry was fine, structure failed. Accepting the loss.','Bias was right but timing early — stopped before the move.','Got stopped by a news spike.','OB was already mitigated, should have skipped.'];
  brk_notes text[] := ARRAY['Took this out of boredom during Asia. No real setup.','Sized up to make back yesterday''s loss.','Moved my stop because I was sure it would turn.','Jumped back in right after a loss.','Entered just before CPI. Should have waited.'];
  lessons_arr text[] := ARRAY['Only trade A+ setups inside my sessions.','Respect the 1% risk rule — no exceptions.','Never move the stop further away.','After a loss, step away for 30 minutes.','Check the news calendar before the session.'];
  item record;
BEGIN
  INSERT INTO trading_accounts(user_id,name,broker,platform,mode,currency,starting_balance,balance,equity,sync_status,is_demo,last_synced_at)
  VALUES (_uid,'Demo account','FloDesk Demo','MT5','manual','USD',10000,10000,10000,'manual',true, now())
  RETURNING id INTO acc_id;

  SELECT array_agg(id ORDER BY name) INTO setup_ids FROM setups WHERE user_id = _uid;
  SELECT id INTO tpl_id FROM checklist_templates WHERE user_id = _uid AND is_default ORDER BY created_at LIMIT 1;

  FOR i IN 0..39 LOOP
    sym := syms[1 + floor(random() * array_length(syms,1))::int];
    brk := (i % 5 = 3);
    brk_kind := (i / 5) % 5;

    IF i = 0 THEN
      d := current_date;
    ELSE
      d := current_date - ceil(i * 1.15)::int;
      WHILE extract(dow FROM d) IN (0,6) LOOP d := d - 1; END LOOP;
    END IF;

    rv := random();
    IF brk AND brk_kind = 0 THEN sess := 'Asia'; hr := 2 + floor(random()*4)::int;
    ELSIF rv < 0.55 THEN sess := 'London'; hr := 7 + floor(random()*4)::int;
    ELSE sess := 'New York'; hr := 13 + floor(random()*4)::int;
    END IF;

    CASE sym
      WHEN 'EURUSD' THEN pip := 0.0001; pv := 10; base := 1.0850 + (random()-0.5)*0.03; dec := 5; sl_p := 8 + floor(random()*15);
      WHEN 'GBPUSD' THEN pip := 0.0001; pv := 10; base := 1.2700 + (random()-0.5)*0.04; dec := 5; sl_p := 10 + floor(random()*18);
      WHEN 'XAUUSD' THEN pip := 0.1; pv := 10; base := 3300 + (random()-0.5)*120; dec := 2; sl_p := 30 + floor(random()*60);
      WHEN 'US30' THEN pip := 1; pv := 1; base := 44000 + (random()-0.5)*1200; dec := 1; sl_p := 40 + floor(random()*60);
      ELSE pip := 1; pv := 1; base := 21000 + (random()-0.5)*800; dec := 1; sl_p := 25 + floor(random()*40);
    END CASE;

    lots := greatest(round(100 / (sl_p * pv), 2), 0.01);
    IF brk AND brk_kind = 1 THEN lots := lots * 2; END IF;
    risk_amt := round(lots * sl_p * pv, 2);

    win := random() < (CASE WHEN brk THEN 0.3 ELSE 0.56 END);
    IF win THEN
      r := round((1.2 + random()*2.3)::numeric, 2);
    ELSIF brk AND brk_kind = 2 THEN
      r := -1.6;
    ELSIF random() < 0.2 THEN
      r := -round((0.3 + random()*0.5)::numeric, 2);
    ELSE
      r := -1;
    END IF;

    dir := CASE WHEN random() < 0.5 THEN 'long' ELSE 'short' END;
    sgn := CASE WHEN dir = 'long' THEN 1 ELSE -1 END;
    pips := round(r * sl_p, 1);
    pnl := round(pips * pv * lots, 2);
    entry := round(base, dec);
    sl := round(entry - sgn * sl_p * pip, dec);
    tp := round(entry + sgn * sl_p * 2.5 * pip, dec);
    exitp := round(entry + sgn * pips * pip, dec);

    IF i = 0 THEN
      opened := now() - interval '3 hours';
    ELSE
      opened := (d::timestamp + make_interval(hours => hr, mins => floor(random()*59)::int)) AT TIME ZONE 'UTC';
    END IF;
    closed := opened + make_interval(mins => 20 + floor(random()*220)::int);
    IF i = 0 AND closed > now() THEN closed := now() - interval '5 minutes'; END IF;

    INSERT INTO trades(user_id, account_id, symbol, direction, lots, entry_price, stop_loss, take_profit, exit_price,
      opened_at, closed_at, status, pips, pnl, risk_amount, r_multiple, setup_id, session, notes, lessons, source, is_demo, external_deal_id)
    VALUES (_uid, acc_id, sym, dir, lots, entry, sl, tp, exitp, opened, closed, 'closed', pips, pnl, risk_amt,
      round(pnl / nullif(risk_amt,0), 2),
      setup_ids[1 + floor(random() * coalesce(array_length(setup_ids,1),1))::int],
      sess,
      CASE WHEN brk THEN brk_notes[brk_kind + 1] WHEN win THEN win_notes[1 + floor(random()*4)::int] ELSE loss_notes[1 + floor(random()*4)::int] END,
      CASE WHEN brk THEN lessons_arr[brk_kind + 1] WHEN NOT win THEN lessons_arr[1 + floor(random()*5)::int] ELSE NULL END,
      'demo', true, 'demo-' || i)
    RETURNING id INTO t_id;

    total := total + pnl;

    INSERT INTO emotion_logs(user_id, trade_id, phase, emotion, intensity) VALUES
      (_uid, t_id, 'before', CASE WHEN brk THEN emo_bad_b[1+floor(random()*3)::int] ELSE emo_good_b[1+floor(random()*3)::int] END, 2 + floor(random()*3)::int),
      (_uid, t_id, 'during', CASE WHEN brk OR NOT win THEN emo_bad_d[1+floor(random()*3)::int] ELSE emo_good_d[1+floor(random()*3)::int] END, 2 + floor(random()*3)::int),
      (_uid, t_id, 'after', CASE WHEN win THEN emo_good_a[1+floor(random()*3)::int] ELSE emo_bad_a[1+floor(random()*3)::int] END, 1 + floor(random()*5)::int);

    IF brk THEN
      INSERT INTO rule_breaks(user_id, trade_id, rule, reason, source) VALUES (_uid, t_id,
        CASE brk_kind WHEN 0 THEN 'session' WHEN 1 THEN 'max_risk' WHEN 2 THEN 'moved_stop' WHEN 3 THEN 'revenge_trade' ELSE 'news_window' END,
        CASE brk_kind
          WHEN 0 THEN 'Opened during the Asia session (allowed: London, New York)'
          WHEN 1 THEN 'Risked ' || round(risk_amt / 100, 1) || '% of balance (limit 1%)'
          WHEN 2 THEN 'Moved stop loss further away mid-trade'
          WHEN 3 THEN 'Re-entered within 10 minutes of a loss'
          ELSE 'Entered 10 minutes before a high-impact USD release (window 30 min)'
        END,
        CASE WHEN brk_kind IN (0,1) THEN 'auto' ELSE 'manual' END);
    END IF;

    IF tpl_id IS NOT NULL THEN
      FOR item IN SELECT id, label FROM checklist_items WHERE template_id = tpl_id ORDER BY position LOOP
        INSERT INTO trade_checklist_results(user_id, trade_id, item_id, label, checked)
        VALUES (_uid, t_id, item.id, item.label, CASE WHEN brk THEN random() > 0.45 ELSE random() > 0.08 END);
      END LOOP;
    END IF;
  END LOOP;

  UPDATE trading_accounts SET balance = 10000 + total, equity = 10000 + total WHERE id = acc_id;

  INSERT INTO daily_plans(user_id, plan_date, biases, key_levels, mindset, notes)
  VALUES (_uid, current_date,
    '[{"symbol":"EURUSD","bias":"bullish"},{"symbol":"XAUUSD","bias":"bearish"},{"symbol":"NAS100","bias":"neutral"}]'::jsonb,
    'EURUSD: 1.0820 demand, 1.0910 PDH. XAUUSD: 3320 supply. NAS100: 21,150 Asia high.', 4,
    'Slept well. Only A+ setups today, max 2 trades.')
  ON CONFLICT (user_id, plan_date) DO NOTHING;
END; $$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_user_defaults(uuid) FROM PUBLIC, anon, authenticated;

-- RPCs callable by the signed-in user
CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  DELETE FROM trades WHERE user_id = auth.uid() AND is_demo;
  DELETE FROM trading_accounts WHERE user_id = auth.uid() AND is_demo;
END; $$;

CREATE OR REPLACE FUNCTION public.load_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM trading_accounts WHERE user_id = auth.uid() AND is_demo) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM checklist_templates WHERE user_id = auth.uid()) THEN
    PERFORM seed_user_defaults(auth.uid());
  END IF;
  PERFORM seed_demo_data(auth.uid());
END; $$;

REVOKE EXECUTE ON FUNCTION public.clear_demo_data() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.load_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_demo_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.load_demo_data() TO authenticated;

-- ========== signup trigger ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles(id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  BEGIN
    PERFORM seed_user_defaults(NEW.id);
    PERFORM seed_demo_data(NEW.id);
  EXCEPTION WHEN others THEN
    RAISE WARNING 'FloDesk seed failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();