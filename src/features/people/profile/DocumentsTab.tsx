import { useRef, useState, type FormEvent } from 'react'
import { Download, FileText, Upload } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { DocumentStatusBadge } from '../../../components/ui/StatusBadge'
import { Skeleton } from '../../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../components/ui/states'
import { SelectField, TextField } from '../../../components/ui/form'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import {
  DOCUMENT_TYPES,
  isSampleDocument,
  useEmployeeDocuments,
  useSignedDocumentUrl,
  useUploadDocument,
  validateDocumentFile,
} from '../../../hooks/useDocuments'
import { documentStatusFromExpiry, formatBytes, formatDate } from '../../../lib/format'
import type { DocumentType, EmployeeWithRelations } from '../../../types/db'

export function DocumentsTab({ employee }: { employee: EmployeeWithRelations }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const isAdmin = profile?.role === 'hr_admin'
  const documents = useEmployeeDocuments(employee.id)
  const signedUrl = useSignedDocumentUrl()
  const upload = useUploadDocument()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState<DocumentType>('Other')
  const [expiry, setExpiry] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function onFileChange(f: File | null) {
    setFile(f)
    setFileError(f ? validateDocumentFile(f) : null)
    if (f && !docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
  }

  async function onView(path: string) {
    try {
      const url = await signedUrl.mutateAsync(path)
      window.open(url, '_blank', 'noopener')
    } catch {
      toast('error', 'Could not open the document. Please try again.')
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault()
    if (!file || !profile) return
    const validation = validateDocumentFile(file)
    if (validation) {
      setFileError(validation)
      return
    }
    if (!docName.trim()) {
      toast('error', 'Enter a document name.')
      return
    }
    try {
      await upload.mutateAsync({
        employeeId: employee.id,
        organizationId: employee.organization_id,
        file,
        documentName: docName.trim(),
        documentType: docType,
        expiryDate: expiry || null,
        uploadedBy: profile.id,
      })
      toast('success', 'Document uploaded.')
      setUploadOpen(false)
      setFile(null)
      setDocName('')
      setDocType('Other')
      setExpiry('')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed. Please try again.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {documents.data ? `${documents.data.length} document${documents.data.length === 1 ? '' : 's'}` : ' '}
        </p>
        {isAdmin && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden /> Upload document
          </Button>
        )}
      </div>

      {documents.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : documents.isError ? (
        <ErrorState onRetry={() => void documents.refetch()} />
      ) : documents.data.length === 0 ? (
        <EmptyState
          title="No documents"
          message={isAdmin ? 'Upload contracts, IDs or certificates for this employee.' : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {documents.data.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{doc.document_name}</p>
                <p className="truncate text-xs text-slate-500">
                  {doc.document_type} · {formatBytes(doc.size_bytes)} · Uploaded {formatDate(doc.upload_date)}
                  {doc.expiry_date && ` · Expires ${formatDate(doc.expiry_date)}`}
                </p>
              </div>
              <DocumentStatusBadge status={documentStatusFromExpiry(doc.expiry_date, doc.status)} />
              {isSampleDocument(doc) ? (
                <span
                  className="inline-flex cursor-default items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                  title="Sample record — no file attached in this showcase"
                >
                  Sample record
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onView(doc.storage_path)}
                  loading={signedUrl.isPending}
                  aria-label={`View ${doc.document_name}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> View
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" form="doc-upload-form" loading={upload.isPending} disabled={!file || !!fileError}>
              Upload
            </Button>
          </div>
        }
      >
        <form id="doc-upload-form" onSubmit={(e) => void onUpload(e)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="doc-file" className="mb-1 block text-sm font-medium text-slate-700">
              File <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="doc-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-100"
            />
            <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, DOC or DOCX — up to 10 MB.</p>
            {fileError && <p role="alert" className="mt-1 text-xs text-red-600">{fileError}</p>}
          </div>
          <TextField label="Document name" required value={docName} onChange={(e) => setDocName(e.target.value)} />
          <SelectField label="Document type" required value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </SelectField>
          <TextField label="Expiry date" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} hint="Optional" />
        </form>
      </Modal>
    </div>
  )
}
