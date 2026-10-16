-- Run once in a Supabase project. Auth users are invited separately; no signup endpoint is provided.
revoke create on schema public from public,anon,authenticated;
create table public.ncl_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin','editor')),
 created_at timestamptz not null default now()
);
create table public.ncl_content (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('tournaments','universities','teams','players','matches','live','sponsors','news','content','settings')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=100000),
 version integer not null default 1,
 published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id) on delete set null
);
create unique index ncl_slug on public.ncl_content(kind,(data->>'slug')) where kind in ('tournaments','news');
create unique index ncl_content_key on public.ncl_content((data->>'key')) where kind='content';
create unique index ncl_settings_one on public.ncl_content(kind) where kind='settings';
create unique index ncl_live_one on public.ncl_content(kind) where kind='live';
create unique index ncl_team_slot on public.ncl_content((data->>'tournamentId'),((data->>'slot')::int)) where kind='teams';
create unique index ncl_match_position on public.ncl_content((data->>'tournamentId'),((data->>'round')::int),((data->>'position')::int)) where kind='matches';
create index ncl_content_public on public.ncl_content(kind,status);
create table public.ncl_media (
 id uuid primary key, path text unique not null, name text not null check(length(name)<=180),
 published boolean not null default false, created_by uuid not null,created_at timestamptz not null default now(),
 check(path=created_by::text || '/' || id::text || '.webp')
);
create table public.ncl_audit (
 id bigint generated always as identity primary key, actor uuid references auth.users(id) on delete set null,
 action text not null, entity_id uuid, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create function public.ncl_role() returns text language sql stable security definer set search_path=public,pg_temp as $$ select role from public.ncl_admins where user_id=auth.uid() $$;
create function public.ncl_visible(record_id uuid) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r public.ncl_content; parent_id uuid;
begin
 select * into r from public.ncl_content where id=record_id;
 if not found or r.status<>'published' then return false; end if;
 if r.kind in ('teams','matches') then parent_id:=(r.data->>'tournamentId')::uuid;
 elsif r.kind='players' then parent_id:=(r.data->>'teamId')::uuid;
 elsif r.kind='live' then parent_id:=nullif(r.data->>'tournamentId','')::uuid; end if;
 if parent_id is not null then return public.ncl_visible(parent_id); end if;
 return true;
end $$;
alter table public.ncl_admins enable row level security;
alter table public.ncl_content enable row level security;
alter table public.ncl_media enable row level security;
alter table public.ncl_audit enable row level security;
create policy admin_read on public.ncl_admins for select to authenticated using(user_id=auth.uid() or public.ncl_role()='owner');
create policy content_read on public.ncl_content for select to anon,authenticated using(public.ncl_role() is not null or public.ncl_visible(id));
create policy media_read on public.ncl_media for select to anon,authenticated using(published or public.ncl_role() is not null);
create policy media_insert on public.ncl_media for insert to authenticated with check(public.ncl_role() is not null and created_by=auth.uid() and not published);
create policy audit_read on public.ncl_audit for select to authenticated using(public.ncl_role() in ('owner','admin'));
revoke all on public.ncl_content,public.ncl_media,public.ncl_admins,public.ncl_audit from public,anon,authenticated;
grant select on public.ncl_content,public.ncl_media to anon,authenticated;
grant select on public.ncl_admins,public.ncl_audit to authenticated;
grant insert on public.ncl_media to authenticated;
revoke insert,update,delete on public.ncl_content,public.ncl_admins,public.ncl_audit from anon,authenticated;
revoke update,delete on public.ncl_media from anon,authenticated;

create function public.ncl_reference(value text, expected_kind text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if value is not null and not exists(select 1 from public.ncl_content where id=value::uuid and kind=expected_kind) then raise exception 'Referenced % record does not exist', expected_kind; end if; end $$;
create function public.ncl_team_for(match_id uuid, side_index int) returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$
declare d jsonb; src jsonb;
begin
 select data into d from public.ncl_content where id=match_id and kind='matches';
 if coalesce((d->>'manualOverride')::boolean,false) or d->'sourceIds'->>side_index is null then return (d->'teamIds'->>side_index)::uuid; end if;
 select data into src from public.ncl_content where id=(d->'sourceIds'->>side_index)::uuid and kind='matches';
 if src->>'status'='finished' and (src->>'resultConfirmed')::boolean then return (src->>'winnerId')::uuid; end if;
 return null;
end $$;

create function public.ncl_validate(k text,d jsonb,record_id uuid,pub text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare f text; l text; ref jsonb; src public.ncl_content; parent public.ncl_content; a uuid; b uuid; winner uuid; m jsonb; wins_a int:=0; wins_b int:=0; needed int; n int; sca int; scb int; allowed text[];
begin
 if jsonb_typeof(d)<>'object' or octet_length(d::text)>100000 then raise exception 'Invalid content document'; end if;
 allowed:=case k
 when 'tournaments' then array['name','slug','startsAt','endsAt','format','teamLimit','rules','banner']
 when 'universities' then array['name','logo','website'] when 'teams' then array['name','tournamentId','universityId','slot','logo']
 when 'players' then array['name','nickname','teamId','role','photo','steamUrl']
 when 'matches' then array['tournamentId','teamIds','sourceIds','round','position','format','status','startsAt','maps','winnerId','resultConfirmed','manualOverride','overrideReason']
 when 'live' then array['name','tournamentId','youtubeUrl','status','description'] when 'sponsors' then array['name','tier','logo','banner','website','description','order']
 when 'news' then array['name','slug','body','cover'] when 'content' then array['key','name','body'] when 'settings' then array['name','featuredTournamentId','contactEmail'] else null end;
 if allowed is null or exists(select 1 from jsonb_object_keys(d) x where not(x=any(allowed))) or not d ?& allowed then raise exception 'Content fields do not match the schema'; end if;
 foreach f in array allowed loop
  if d->>f is null and not(f=any(array['startsAt','endsAt','banner','logo','photo','cover','website','steamUrl','youtubeUrl','universityId','winnerId','featuredTournamentId','contactEmail'])) and not(k='live' and f='tournamentId') then raise exception 'Required field % cannot be null',f;end if;
 end loop;
 foreach f in array array['slot','round','position','teamLimit','order'] loop
  if d ? f and jsonb_typeof(d->f)<>'number' then raise exception 'Field % must be numeric',f;end if;
 end loop;
 foreach f in array array['slug','nickname','overrideReason','key','format','status','tier','website','steamUrl','youtubeUrl','contactEmail','startsAt','endsAt','logo','banner','photo','cover','tournamentId','universityId','teamId','winnerId','featuredTournamentId'] loop
  if d->>f is not null and jsonb_typeof(d->f)<>'string' then raise exception 'Field % must be text',f;end if;
 end loop;
 if length(d->>'overrideReason')>2000 then raise exception 'Override reason is too long';end if;
 foreach f in array array['name','rules','body','description','role'] loop
  if d ? f then
   if jsonb_typeof(d->f)<>'object' or not (d->f ?& array['uz','ru','en']) or (select count(*) from jsonb_object_keys(d->f))<>3 then raise exception 'All three languages are required for %',f; end if;
   foreach l in array array['uz','ru','en'] loop
    if jsonb_typeof(d->f->l)<>'string' or length(trim(d->f->>l))=0 or length(d->f->>l)>(case when f in ('name','role') then 180 else 20000 end) then raise exception 'Invalid translation for %',f; end if;
   end loop;
  end if;
 end loop;
 foreach f in array array['website','steamUrl','youtubeUrl'] loop
  if d->>f is not null and ((d->>f)!~'^https://[^/@[:space:]]+(/[^[:space:]]*)?$' or length(d->>f)>2048) then raise exception 'Use HTTPS URLs without credentials'; end if;
 end loop;
 if d->>'steamUrl' is not null and (d->>'steamUrl')!~'^https://steamcommunity\.com/(id|profiles)/[A-Za-z0-9_-]+/?$' then raise exception 'Invalid Steam profile'; end if;
 if d->>'youtubeUrl' is not null and (d->>'youtubeUrl')!~'^https://((www\.)?youtube\.com/(watch\?v=|live/)|youtu\.be/)[A-Za-z0-9_-]{11}([?&].*)?$' then raise exception 'Invalid YouTube video URL'; end if;
 foreach f in array array['logo','photo','banner','cover'] loop
  if d->>f is not null and not exists(select 1 from public.ncl_media where '/media/'||id::text=d->>f and (pub<>'published' or published)) then raise exception 'Image must exist and be public before publishing'; end if;
 end loop;
 foreach f in array array['startsAt','endsAt'] loop
  if d->>f is not null then
   if (d->>f)!~'(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Dates require a timezone'; end if;
   perform (d->>f)::timestamptz;
  end if;
 end loop;
 if d ? 'slug' and ((d->>'slug')!~'^[a-z0-9]+(-[a-z0-9]+)*$' or length(d->>'slug')>100) then raise exception 'Invalid slug'; end if;
 if k='tournaments' then
  if (d->>'format') not in ('single_elimination','round_robin','groups_playoffs') or (d->>'teamLimit') not in ('2','4','8','16','32','64') then raise exception 'Invalid tournament format/capacity'; end if;
  if (d->>'endsAt')::timestamptz<(d->>'startsAt')::timestamptz then raise exception 'End must follow start'; end if;
 end if;
 if k in ('teams','matches','live') then
  if k<>'live' and d->>'tournamentId' is null then raise exception 'Tournament is required'; end if;
  perform public.ncl_reference(d->>'tournamentId','tournaments');
  select * into parent from public.ncl_content where id=(d->>'tournamentId')::uuid;
  if k in ('teams','matches') and parent.id is null then raise exception 'Tournament is required'; end if;
  if pub='published' and parent.id is not null and parent.status<>'published' then raise exception 'Publish the tournament first'; end if;
 end if;
 if k='teams' then
  perform public.ncl_reference(d->>'universityId','universities');
  if (d->>'slot')!~'^[0-9]+$' or (d->>'slot')::int<1 or (d->>'slot')::int>(parent.data->>'teamLimit')::int then raise exception 'Slot exceeds tournament capacity'; end if;
 end if;
 if k='players' then
  if d->>'teamId' is null then raise exception 'Team is required'; end if;
  perform public.ncl_reference(d->>'teamId','teams');
  if pub='published' and not public.ncl_visible((d->>'teamId')::uuid) then raise exception 'Publish the team first'; end if;
  if length(trim(d->>'nickname')) not between 1 and 60 then raise exception 'Nickname is required'; end if;
 end if;
 if k='live' and ((d->>'status') not in ('offline','upcoming','live') or ((d->>'status')<>'offline' and d->>'youtubeUrl' is null)) then raise exception 'Invalid broadcast state'; end if;
 if k='sponsors' and ((d->>'tier') not in ('title','official','technology','community') or (d->>'order')!~'^[0-9]+$' or (d->>'order')::int>1000) then raise exception 'Invalid sponsor tier/order'; end if;
 if k='content' and (d->>'key') not in ('hero_intro','league_about','contact_note','home_headline') then raise exception 'Unknown site placement'; end if;
 if k='settings' then
  perform public.ncl_reference(d->>'featuredTournamentId','tournaments');
  if d->>'contactEmail' is not null and ((d->>'contactEmail')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(d->>'contactEmail')>254) then raise exception 'Invalid contact email'; end if;
 end if;
 if k='matches' then
  if (d->>'round')!~'^[0-9]+$' or (d->>'round')::int>5 or (d->>'position')!~'^[0-9]+$' or (d->>'position')::int>31 or (d->>'format') not in ('BO1','BO3','BO5') or (d->>'status') not in ('pending','scheduled','live','finished') then raise exception 'Invalid match format/position/status'; end if;
  if jsonb_typeof(d->'teamIds')<>'array' or jsonb_array_length(d->'teamIds')<>2 or jsonb_typeof(d->'sourceIds')<>'array' or jsonb_array_length(d->'sourceIds')<>2 or jsonb_typeof(d->'maps')<>'array' or jsonb_typeof(d->'resultConfirmed')<>'boolean' or jsonb_typeof(d->'manualOverride')<>'boolean' or jsonb_typeof(d->'overrideReason')<>'string' then raise exception 'Invalid match fields'; end if;
  if (d->>'manualOverride')::boolean and (public.ncl_role() not in ('owner','admin') or length(trim(d->>'overrideReason'))<10) then raise exception 'Manual overrides require admin and a reason'; end if;
  if d->>'status'='scheduled' and d->>'startsAt' is null then raise exception 'Scheduled matches need a date'; end if;
  for n in 0..1 loop
   perform public.ncl_reference(d->'teamIds'->>n,'teams');
   if d->'teamIds'->>n is not null and not exists(select 1 from public.ncl_content where id=(d->'teamIds'->>n)::uuid and data->>'tournamentId'=d->>'tournamentId' and (pub<>'published' or status='published')) then raise exception 'Team must belong to this tournament and be published for published matches'; end if;
   if d->'sourceIds'->>n is not null then
    select * into src from public.ncl_content where id=(d->'sourceIds'->>n)::uuid and kind='matches';
    if not found or src.id=record_id or src.data->>'tournamentId'<>d->>'tournamentId' or (src.data->>'round')::int>=(d->>'round')::int or (pub='published' and src.status<>'published') then raise exception 'Source must be a preceding match in the same tournament'; end if;
    if not (d->>'manualOverride')::boolean and d->'teamIds'->>n is not null then raise exception 'Use a source or an explicit team, unless overriding'; end if;
   end if;
  end loop;
  if d->'sourceIds'->>0 is not null and d->'sourceIds'->>0=d->'sourceIds'->>1 then raise exception 'Source matches must differ'; end if;
  -- Save is already written in this transaction; resolve against the new document.
  a:=public.ncl_team_for(record_id,0); b:=public.ncl_team_for(record_id,1);
  if a is not null and a=b then raise exception 'A team cannot play itself'; end if;
  if d->>'status' in ('live','finished') and (a is null or b is null) then raise exception 'Both participants must be resolved'; end if;
  needed:=substring(d->>'format' from 3)::int;
  if jsonb_array_length(d->'maps')>needed then raise exception 'Too many maps'; end if;
  if (select count(distinct lower(value->>'name')) from jsonb_array_elements(d->'maps'))<>jsonb_array_length(d->'maps') then raise exception 'Map names must be unique'; end if;
  for m in select value from jsonb_array_elements(d->'maps') loop
   if jsonb_typeof(m)<>'object' or jsonb_typeof(m->'name')<>'string' or (select count(*) from jsonb_object_keys(m))<>2 or jsonb_typeof(m->'scores'->0)<>'number' or jsonb_typeof(m->'scores'->1)<>'number' or length(trim(m->>'name')) not between 1 and 60 or not m ?& array['name','scores'] or jsonb_typeof(m->'scores')<>'array' or jsonb_array_length(m->'scores')<>2 or (m->'scores'->>0)!~'^[0-9]+$' or (m->'scores'->>1)!~'^[0-9]+$' then raise exception 'Invalid map'; end if;
   sca:=(m->'scores'->>0)::int;scb:=(m->'scores'->>1)::int;
   if sca>100 or scb>100 or sca=scb then raise exception 'Map scores must be valid and not tied'; end if;
   if wins_a>needed/2 or wins_b>needed/2 then raise exception 'No maps may follow a series-winning map'; end if;
   if sca>scb then wins_a:=wins_a+1;else wins_b:=wins_b+1;end if;
  end loop;
  winner:=(d->>'winnerId')::uuid;
  if d->>'status'='finished' then
   if not (d->>'resultConfirmed')::boolean or winner is null or greatest(wins_a,wins_b)<>needed/2+1 or winner<>(case when wins_a>wins_b then a else b end) then raise exception 'Confirmed winner must match the completed map results'; end if;
  elsif winner is not null or (d->>'resultConfirmed')::boolean then raise exception 'Only finished matches can have confirmed winners'; end if;
 end if;
end $$;

create function public.ncl_save(record_id uuid,record_kind text,publication text,document jsonb,expected_version int) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.ncl_content; new_id uuid:=coalesce(record_id,gen_random_uuid()); r text:=public.ncl_role();
begin
 if r is null then raise exception 'Administrator access required'; end if;
 -- Serialize graph/config writes and use optimistic versioning to prevent lost edits.
 perform pg_advisory_xact_lock(7162026);
 if publication not in ('draft','published','archived') then raise exception 'Invalid publication'; end if;
 select * into old from public.ncl_content where id=new_id for update;
 if record_id is not null and (old.id is null or old.version is distinct from expected_version or old.kind<>record_kind) then raise exception 'Record changed or was deleted. Reload before editing.'; end if;
 if record_kind='settings' and r<>'owner' then raise exception 'Only owners may edit settings'; end if;
 if r='editor' and (publication<>'draft' or coalesce(old.status,'draft')<>'draft') then raise exception 'Editors may edit drafts only'; end if;
 if old.kind='teams' and old.data->>'tournamentId' is distinct from document->>'tournamentId' and exists(select 1 from public.ncl_content where kind='matches' and (data->'teamIds' @> to_jsonb(array[new_id::text]) or data->>'winnerId'=new_id::text)) then raise exception 'A referenced team cannot move tournaments';end if;
 if old.kind='tournaments' and old.data->>'teamLimit' is distinct from document->>'teamLimit' and exists(select 1 from public.ncl_content where data->>'tournamentId'=new_id::text) then raise exception 'Capacity cannot change after participants or fixtures exist';end if;
 if old.kind='matches' and (old.data->>'round' is distinct from document->>'round' or old.data->>'tournamentId' is distinct from document->>'tournamentId') and exists(select 1 from public.ncl_content where kind='matches' and data->'sourceIds' @> to_jsonb(array[new_id::text])) then raise exception 'Remove downstream source links before moving this match';end if;
 if old.kind='matches' and (old.data<>document or old.status<>publication) and exists(
  with recursive descendants as (select c.* from public.ncl_content c where c.kind='matches' and c.data->'sourceIds' @> to_jsonb(array[new_id::text]) union all select c.* from public.ncl_content c join descendants d on c.data->'sourceIds' @> to_jsonb(array[d.id::text]) where c.kind='matches')
  select 1 from descendants where data->>'status' in ('live','finished')
 ) then raise exception 'A dependent match has started. Reopen downstream results first.'; end if;
 if old.id is not null then update public.ncl_content set data=document,status=publication,published_at=case when publication='published' then coalesce(published_at,now()) else published_at end,version=version+1,updated_at=now(),updated_by=auth.uid() where id=new_id;
 else insert into public.ncl_content(id,kind,status,data,updated_by,published_at) values(new_id,record_kind,publication,document,auth.uid(),case when publication='published' then now() else null end);end if;
 perform public.ncl_validate(record_kind,document,new_id,publication);
 insert into public.ncl_audit(actor,action,entity_id,before_data,after_data) values(auth.uid(),'save:'||record_kind,new_id,to_jsonb(old),jsonb_build_object('data',document,'status',publication));
 return new_id;
end $$;

create function public.ncl_delete(record_id uuid,expected_version int) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.ncl_content;
begin
 if public.ncl_role() not in ('owner','admin') or public.ncl_role() is null then raise exception 'Publishing administrator required'; end if;
 perform pg_advisory_xact_lock(7162026);
 select * into old from public.ncl_content where id=record_id for update;
 if old.id is null or old.version is distinct from expected_version then raise exception 'Record changed. Reload.'; end if;
 if old.kind='settings' and public.ncl_role()<>'owner' then raise exception 'Owner required'; end if;
 if exists(select 1 from public.ncl_content where id<>record_id and (data->>'tournamentId'=record_id::text or data->>'teamId'=record_id::text or data->>'universityId'=record_id::text or data->>'featuredTournamentId'=record_id::text or data->'teamIds' @> to_jsonb(array[record_id::text]) or data->'sourceIds' @> to_jsonb(array[record_id::text]) or data->>'winnerId'=record_id::text)) then raise exception 'Record is referenced. Archive it or remove dependent records first.'; end if;
 delete from public.ncl_content where id=record_id;
 insert into public.ncl_audit(actor,action,entity_id,before_data) values(auth.uid(),'delete:'||old.kind,record_id,to_jsonb(old));
end $$;
create function public.ncl_manage_admin(target_id uuid,new_role text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_role text;
begin
 if public.ncl_role() is distinct from 'owner' then raise exception 'Owner required'; end if;
 perform pg_advisory_xact_lock(7162026);
 if new_role is not null and new_role not in ('owner','admin','editor') then raise exception 'Invalid role'; end if;
 select role into old_role from public.ncl_admins where user_id=target_id;
 if old_role='owner' and new_role is distinct from 'owner' and (select count(*) from public.ncl_admins where role='owner')<=1 then raise exception 'Cannot remove the final owner'; end if;
 if new_role is null then delete from public.ncl_admins where user_id=target_id;
 else insert into public.ncl_admins(user_id,role) values(target_id,new_role) on conflict(user_id) do update set role=excluded.role;end if;
 insert into public.ncl_audit(actor,action,entity_id,before_data,after_data) values(auth.uid(),'admin:role',target_id,to_jsonb(old_role),to_jsonb(new_role));
end $$;
create function public.ncl_media_visibility(media_id uuid,is_public boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.ncl_role() is null or public.ncl_role() not in ('owner','admin') then raise exception 'Publishing administrator required'; end if;
 perform pg_advisory_xact_lock(7162026);
 if not is_public and exists(select 1 from public.ncl_content where status='published' and jsonb_path_exists(data,'$.** ? (@ == $url)',jsonb_build_object('url','/media/'||media_id::text))) then raise exception 'Image is used by published content. Unpublish that content first.';end if;
 update public.ncl_media set published=is_public where id=media_id;
 if not found then raise exception 'Image not found';end if;
 insert into public.ncl_audit(actor,action,entity_id,after_data) values(auth.uid(),'media:visibility',media_id,jsonb_build_object('published',is_public));
end $$;
-- Internal security-definer helpers must not expose unpublished relationships through RPC.
revoke all on function public.ncl_reference(text,text), public.ncl_team_for(uuid,int),public.ncl_validate(text,jsonb,uuid,text) from public,anon,authenticated;
revoke all on function public.ncl_save(uuid,text,text,jsonb,int),public.ncl_delete(uuid,int),public.ncl_manage_admin(uuid,text),public.ncl_media_visibility(uuid,boolean) from public,anon;
grant execute on function public.ncl_save(uuid,text,text,jsonb,int),public.ncl_delete(uuid,int),public.ncl_manage_admin(uuid,text),public.ncl_media_visibility(uuid,boolean) to authenticated;
revoke all on function public.ncl_role(),public.ncl_visible(uuid) from public;
grant execute on function public.ncl_role(),public.ncl_visible(uuid) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ncl-media','ncl-media',false,3145728,array['image/webp']) on conflict(id) do nothing;
create policy ncl_storage_read on storage.objects for select to anon,authenticated using(bucket_id='ncl-media' and (public.ncl_role() is not null or exists(select 1 from public.ncl_media m where m.path=storage.objects.name and m.published)));
create policy ncl_storage_insert on storage.objects for insert to authenticated with check(bucket_id='ncl-media' and public.ncl_role() is not null and (storage.foldername(name))[1]=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
-- Only remove orphaned uploads; images with metadata cannot be removed through direct Storage calls.
create policy ncl_storage_cleanup on storage.objects for delete to authenticated using(bucket_id='ncl-media' and public.ncl_role() is not null and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.ncl_media m where m.path=storage.objects.name));

create function public.ncl_generate_bracket(tournament_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare tournament public.ncl_content;seed_ids uuid[];previous_ids uuid[];next_ids uuid[];new_match uuid;capacity int;round_index int:=0;pair_index int;
begin
 if public.ncl_role() is null or public.ncl_role() not in ('owner','admin') then raise exception 'Publishing administrator required';end if;
 perform pg_advisory_xact_lock(7162026);
 select * into tournament from public.ncl_content where id=tournament_id and kind='tournaments';
 if not found or tournament.data->>'format'<>'single_elimination' then raise exception 'Select a single-elimination tournament';end if;
 if exists(select 1 from public.ncl_content where kind='matches' and data->>'tournamentId'=tournament_id::text) then raise exception 'Tournament already has fixtures. Edit the existing bracket.';end if;
 capacity:=(tournament.data->>'teamLimit')::int;
 select array_agg(id order by (data->>'slot')::int) into seed_ids from public.ncl_content where kind='teams' and status<>'archived' and data->>'tournamentId'=tournament_id::text;
 if coalesce(array_length(seed_ids,1),0)<>capacity then raise exception 'Fill every tournament team slot before generating';end if;
 while capacity>1 loop
  next_ids:=array[]::uuid[];
  for pair_index in 0..(capacity/2-1) loop
   new_match:=public.ncl_save(null,'matches','draft',jsonb_build_object('tournamentId',tournament_id,'teamIds',case when round_index=0 then jsonb_build_array(seed_ids[pair_index*2+1],seed_ids[pair_index*2+2]) else '[null,null]'::jsonb end,'sourceIds',case when round_index=0 then '[null,null]'::jsonb else jsonb_build_array(previous_ids[pair_index*2+1],previous_ids[pair_index*2+2]) end,'round',round_index,'position',pair_index,'format',case when capacity=2 then 'BO5' else 'BO3' end,'status','pending','startsAt',null,'maps','[]'::jsonb,'winnerId',null,'resultConfirmed',false,'manualOverride',false,'overrideReason',''),0);
   next_ids:=array_append(next_ids,new_match);
  end loop;
  previous_ids:=next_ids;capacity:=capacity/2;round_index:=round_index+1;
 end loop;
end $$;
revoke all on function public.ncl_generate_bracket(uuid) from public,anon;
grant execute on function public.ncl_generate_bracket(uuid) to authenticated;

create function public.ncl_audit_upload() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into public.ncl_audit(actor,action,entity_id,after_data) values(auth.uid(),'media:upload',new.id,jsonb_build_object('path',new.path,'name',new.name));return new;end $$;
create trigger ncl_media_upload_audit after insert on public.ncl_media for each row execute function public.ncl_audit_upload();
revoke all on function public.ncl_audit_upload() from public,anon,authenticated;
