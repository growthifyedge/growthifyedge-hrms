import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import type { DocumentType, EmployeeDocument } from '../types/db'

export const DOCUMENTS_BUCKET = 'employee-documents'
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
}

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']

export const DOCUMENT_TYPES: DocumentType[] = [
  'Employment Contract',
  'Identification',
  'Resume',
  'Offer Letter',
  'Certificate',
  'Policy Acknowledgement',
  'Other',
]

/** Client-side validation; storage policies enforce the same rules server-side. */
export function validateDocumentFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES[file.type]) {
    return 'Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File is too large. The maximum size is 10 MB.'
  }
  return null
}

export function useEmployeeDocuments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-documents', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('upload_date', { ascending: false })
      if (error) throw error
      return data as EmployeeDocument[]
    },
  })
}

interface UploadArgs {
  employeeId: string
  organizationId: string
  file: File
  documentName: string
  documentType: DocumentType
  expiryDate: string | null
  uploadedBy: string
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: UploadArgs) => {
      const supabase = getSupabase()
      const validation = validateDocumentFile(args.file)
      if (validation) throw new Error(validation)

      const ext = args.file.name.split('.').pop()?.toLowerCase()
      const generated = `${crypto.randomUUID()}.${ext}`
      const path = `${args.organizationId}/${args.employeeId}/${generated}`

      const { error: uploadErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, args.file, { contentType: args.file.type, upsert: false })
      if (uploadErr) throw uploadErr

      const { error: metaErr } = await supabase.from('employee_documents').insert({
        organization_id: args.organizationId,
        employee_id: args.employeeId,
        document_name: args.documentName,
        document_type: args.documentType,
        storage_path: path,
        mime_type: args.file.type,
        size_bytes: args.file.size,
        upload_date: new Date().toISOString().slice(0, 10),
        expiry_date: args.expiryDate,
        status: 'Pending Review',
        uploaded_by: args.uploadedBy,
      })
      if (metaErr) {
        // Roll back the orphaned storage object so metadata and storage stay in sync.
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path])
        throw metaErr
      }
    },
    onSuccess: async (_data, args) => {
      await qc.invalidateQueries({ queryKey: ['employee-documents', args.employeeId] })
    },
  })
}

/** Creates a short-lived signed URL for secure viewing/downloading. */
export function useSignedDocumentUrl() {
  return useMutation({
    mutationFn: async (storagePath: string) => {
      const { data, error } = await getSupabase()
        .storage.from(DOCUMENTS_BUCKET)
        .createSignedUrl(storagePath, 60 * 5)
      if (error) throw error
      return data.signedUrl
    },
  })
}
