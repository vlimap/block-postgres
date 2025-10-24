import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export async function exportDiagramPDF(container: HTMLElement, orientation: 'landscape' | 'portrait' = 'landscape') {
  const dataUrl = await toPng(container, { pixelRatio: 2 });
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const pdf = new jsPDF({ orientation, unit: 'pt' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (pageWidth - w) / 2;
  const y = (pageHeight - h) / 2;

  pdf.addImage(img, 'PNG', x, y, w, h);
  pdf.save('diagram.pdf');
}
