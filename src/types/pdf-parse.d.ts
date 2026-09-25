declare module "pdf-parse" {
  type PdfParseOptions = Record<string, unknown>

  export type PdfParseResult = {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: unknown
    text: string
    version: string
  }

  export default function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>
}
