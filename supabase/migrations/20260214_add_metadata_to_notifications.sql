
-- Add metadata column to notifications table
alter table public.notifications 
add column if not exists metadata jsonb default '{}'::jsonb;
