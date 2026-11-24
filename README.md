# FloDesk Trading Journal

Build a trading workflow web app for forex/indices/crypto traders called "FloDesk". It helps a trader plan, take, journal and review trades in one place. It is NOT a signal service and never places trades — broker access is read-only.

Stack: React + TypeScript + Tailwind + shadcn/ui, Lovable Cloud for auth, Postgres database, file storage and edge functions. Dark theme by default, clean trading-terminal look (deep navy/near-black background, green for profit, red for loss, one accent colour), sidebar navigation, fully responsive.

AUTH: Email/password + Google sign-in. Each user only sees their own data (row-level security on every table).

PAGES (sidebar):
1. Dashboard — balance/equity, today's P&L, win rate, profit factor, average R, expectancy, max drawdown, current streak. Equity curve chart, P&L calendar heatmap by day, P&L by symbol, by session (Asia/London/New York), by setup, by weekday. Date-range and account filters. Discipline score (% of trades with zero rule breaks).
2. Journal — table of all trades (synced + manual): date, account, symbol, direction, lots, entry, SL, TP, exit, pips, P&L, R-multiple, setup, session, rule breaks. Clicking a trade opens a detail drawer: chart screenshots (upload to storage, before/after), setup tag, emotions before/during/after (pick list + 1–5 intensity), notes, lessons learned, checklist results, rule breaks. Manual "Add trade" form.
3. Risk Calculator — inputs: account balance (auto-filled from selected account), risk % or fixed amount, symbol, entry, stop loss, take profit. Output: lot size, pip value, money at risk, R:R, potential profit. Correct pip/contract sizes for FX majors/minors, JPY pairs, XAUUSD, indices (US30, NAS100, GER40) and BTCUSD, with an editable symbol settings table.
4. Guardrails — user rules: max risk per trade %, max daily loss %, max weekly loss %, max trades per day, max consecutive losses, allowed sessions/hours, allowed symbols, no-trade window before/after high-impact news (minutes). Live status panel (green/amber/red) showing today's usage vs limits. Every trade is checked automatically and violations are logged as rule breaks with the reason. Show an app-wide warning banner when a limit is hit ("Daily limit reached — stop trading for today").
5. Trade Plan & Checklist — user builds strategy rules and a pre-trade checklist. Default template: HTF bias identified, market structure shift (MSS) confirmed, break of structure (BOS) confirmed, order block (OB) identified, liquidity sweep taken, entry inside OB, SL beyond structure, minimum 1:2 R:R, no high-impact news within window, within allowed session. Daily pre-market routine: bias per pair, key levels, mindset check (1–5), notes. Checklist results attach to a trade.
6. AI Coach ("Ask Flo") — chat that answers questions using the user's own journal and stats (edge function calling Lovable AI with a summary of their trades, rule breaks, emotions and checklist data). Plus a one-click weekly report: what worked, biggest leaks, rule-break patterns, emotional patterns, 3 focus points for next week. Saved reports list. Clear disclaimer: coaching only, not financial advice or signals.
7. Accounts — connect trading accounts. Two modes:
   (a) Live MT5/MT4 sync via MetaApi (metaapi.cloud): user enters MT login, investor (read-only) password and broker server; an edge function provisions the account through the MetaApi REST API and a scheduled function pulls closed deals, open positions, balance and equity every few minutes into the trades table (dedupe by deal ID). Store the MetaApi API token as a server secret named METAAPI_TOKEN, never in the client. Never store the investor password in plain text in the client.
   (b) Manual/import account: upload an MT5 account history report (CSV or HTML export) and parse it into trades.
   Show sync status and last-synced time per account.
8. Settings — profile, base currency, timezone (default Africa/Lagos), session times, symbol settings, CSV export of trades.

DATA MODEL (minimum): profiles, trading_accounts, trades, trade_screenshots, setups, emotion_logs, guardrail_rules, rule_breaks, checklist_templates, checklist_items, trade_checklist_results, daily_plans, ai_reports, ai_messages, symbol_settings.

On first login, seed ~40 realistic demo trades on a "Demo account" (mix of EURUSD, GBPUSD, XAUUSD, US30, NAS100; wins and losses; some rule breaks; emotions filled in) so the dashboard looks alive, with a "Clear demo data" button in Settings.

Build the core first: auth, layout/sidebar, database, Dashboard, Journal, Risk Calculator, Guardrails, Trade Plan & Checklist. If the MetaApi token secret is not set yet, the Accounts page should still work for manual/import accounts and show a clear "Live sync not configured" state.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9962f091-2b23-4bab-8623-1d29dfbcfb50).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
