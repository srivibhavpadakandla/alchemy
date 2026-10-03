create table public.frontdesk_bookings (
  program_id text not null references public.programs on delete cascade,
  key uuid not null,
  partner_id text not null,
  actor_id uuid not null references auth.users,
  input_hash text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at>starts_at),
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(program_id,key),
  foreign key(program_id,partner_id) references public.partners(program_id,id)
);
alter table public.frontdesk_bookings enable row level security;
create policy frontdesk_booking_read on public.frontdesk_bookings for select to authenticated using (
  public.can_read(program_id) or exists(select 1 from memberships where program_id=frontdesk_bookings.program_id and user_id=auth.uid() and role='customer' and partner_id=frontdesk_bookings.partner_id)
);
create or replace function public.reserve_frontdesk_booking(p_program text,p_partner text,p_actor uuid,p_key uuid,p_hash text,p_start timestamptz,p_end timestamptz) returns jsonb language plpgsql security definer set search_path=public as $$
declare previous public.frontdesk_bookings;
begin
  if auth.role()<>'service_role' then raise exception 'Service only'; end if;
  perform 1 from programs where id=p_program for update;
  if not exists(select 1 from memberships where program_id=p_program and user_id=p_actor and (role in ('owner','editor') or (role='customer' and partner_id=p_partner))) then raise exception 'Booking access denied'; end if;
  select * into previous from frontdesk_bookings where program_id=p_program and key=p_key;
  if found then
    if previous.input_hash<>p_hash or previous.partner_id<>p_partner or previous.actor_id<>p_actor then raise exception 'Booking key already used for different input'; end if;
    return jsonb_build_object('acquired',false,'receipt',previous.receipt);
  end if;
  if p_end-p_start<interval '5 minutes' or p_end-p_start>interval '4 hours' or p_start<now() or p_start>now()+interval '180 days' then raise exception 'Invalid appointment time'; end if;
  if exists(select 1 from frontdesk_bookings where program_id=p_program and starts_at<p_end and ends_at>p_start and receipt->>'status' in ('processing','confirmed','uncertain')) then raise exception 'Appointment overlaps a reserved or confirmed booking'; end if;
  insert into frontdesk_bookings(program_id,key,partner_id,actor_id,input_hash,starts_at,ends_at,receipt) values(p_program,p_key,p_partner,p_actor,p_hash,p_start,p_end,jsonb_build_object('status','processing','calendarStatus','not attempted','smsStatus','not attempted','executionLeaseUntil',now()+interval '5 minutes')) returning * into previous;
  return jsonb_build_object('acquired',true,'receipt',previous.receipt);
end $$;
revoke all on function public.reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz) from public;
grant execute on function public.reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz) to service_role;
