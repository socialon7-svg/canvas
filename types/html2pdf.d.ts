declare module "html2pdf.js" {
  interface Html2PdfWorker {
    set(options: Record<string, unknown>): Html2PdfWorker;
    from(element: HTMLElement): Html2PdfWorker;
    save(): Promise<void>;
  }

  interface Html2Pdf {
    (): Html2PdfWorker;
  }

  const html2pdf: Html2Pdf;
  export default html2pdf;
}
