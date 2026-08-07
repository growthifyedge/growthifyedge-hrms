import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES, isSampleDocument, validateDocumentFile } from './useDocuments'

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateDocumentFile', () => {
  it('accepts valid PDF files', () => {
    expect(validateDocumentFile(makeFile('contract.pdf', 'application/pdf', 1024))).toBeNull()
  })

  it('accepts JPG, PNG, DOC and DOCX', () => {
    expect(validateDocumentFile(makeFile('id.jpg', 'image/jpeg', 1024))).toBeNull()
    expect(validateDocumentFile(makeFile('id.png', 'image/png', 1024))).toBeNull()
    expect(validateDocumentFile(makeFile('cv.doc', 'application/msword', 1024))).toBeNull()
    expect(
      validateDocumentFile(
        makeFile('cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024),
      ),
    ).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateDocumentFile(makeFile('script.exe', 'application/x-msdownload', 10))).toMatch(/unsupported/i)
    expect(validateDocumentFile(makeFile('sheet.xlsx', 'application/vnd.ms-excel', 10))).toMatch(/unsupported/i)
  })

  it('rejects extension/MIME mismatches', () => {
    expect(validateDocumentFile(makeFile('fake.pdf', 'application/x-msdownload', 10))).toMatch(/unsupported/i)
  })

  it('rejects oversized files', () => {
    expect(validateDocumentFile(makeFile('big.pdf', 'application/pdf', MAX_FILE_BYTES + 1))).toMatch(/too large/i)
  })

  it('accepts a file exactly at the limit', () => {
    expect(validateDocumentFile(makeFile('edge.pdf', 'application/pdf', MAX_FILE_BYTES))).toBeNull()
  })
})

describe('isSampleDocument', () => {
  it('flags seeded metadata-only rows', () => {
    expect(isSampleDocument({ storage_path: 'org/emp/seed-contract.pdf' })).toBe(true)
  })

  it('does not flag real uploads', () => {
    expect(isSampleDocument({ storage_path: 'org/emp/0a1b2c3d.pdf' })).toBe(false)
  })
})
