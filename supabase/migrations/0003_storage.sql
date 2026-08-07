-- GrowthifyEdge HRMS — Wave 1 storage bucket and policies
-- Private bucket for employee documents.
-- Path convention: <organization_id>/<employee_id>/<generated-file-name>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-documents',
  'employee-documents',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Read: HR admin for any org file; employees for their own folder;
-- managers for their direct reports' folders.
create policy employee_documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (
      public.is_hr_admin()
      or public.can_view_employee(((storage.foldername(name))[2])::uuid)
    )
  );

-- Write (upload): HR admin only, within their org's folder.
create policy employee_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_hr_admin()
  );

-- Update/remove (e.g. rollback of failed metadata insert): HR admin only.
create policy employee_documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_hr_admin()
  );

create policy employee_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'employee-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_hr_admin()
  );
