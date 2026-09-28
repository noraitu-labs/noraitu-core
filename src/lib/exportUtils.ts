/**
 * NORA TITÁN UNIVERSAL — Módulo Ejecutivo de Exportación Documental
 * Generación institucional de Word (.doc/.docx), PDF ejecutivo y Presentaciones (.html/.pptx).
 */

export function cleanMarkdown(markdown: string): string {
  if (!markdown) return "";
  let html = markdown;

  // Encabezados
  html = html.replace(/^### (.*$)/gim, '<h3 style="color:#2563eb; font-size:15px; font-weight:700; margin-top:16px; margin-bottom:8px;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color:#1e3a8a; font-size:18px; font-weight:800; margin-top:20px; margin-bottom:10px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color:#0f172a; font-size:22px; font-weight:900; margin-top:24px; margin-bottom:12px; border-bottom:2px solid #3b82f6; padding-bottom:6px;">$1</h1>');

  // Formato de texto
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700; color:#0f172a;">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong style="font-weight:700; color:#0f172a;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Viñetas
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li style="margin-bottom:6px; list-style-type:disc; margin-left:20px;">$1</li>');

  // Separadores
  html = html.replace(/^[\-\*_]{3,}\s*$/gim, '<hr style="border:0; border-top:1px solid #cbd5e1; margin:18px 0;" />');

  // Párrafos
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (trimmed.startsWith("<h") || trimmed.startsWith("<li") || trimmed.startsWith("<hr")) {
        return trimmed;
      }
      return `<p style="margin-bottom:12px; line-height:1.65; text-align:justify; color:#334155;">${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  return html;
}

export function exportToWord(filename: string, title: string, content: string) {
  if (typeof window === "undefined") return;
  const cleanBodyHtml = cleanMarkdown(content);

  const documentTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #0f172a; margin: 1in; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 24px; font-size: 9pt; font-weight: bold; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
        h1 { font-size: 18pt; color: #0f172a; margin-top: 10px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        h2 { font-size: 14pt; color: #1e3a8a; margin-top: 18px; margin-bottom: 8px; }
        h3 { font-size: 12pt; color: #1d4ed8; margin-top: 14px; margin-bottom: 6px; }
        p { margin-bottom: 10px; text-align: justify; }
        ul { margin-bottom: 10px; padding-left: 20px; }
        li { margin-bottom: 4px; }
        .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8pt; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">NORA TITÁN UNIVERSAL — REPORTE INSTITUCIONAL ESTRATÉGICO</div>
      <h1>${title}</h1>
      <div>${cleanBodyHtml}</div>
      <div class="footer">Nora Titán Universal | Asistencia Agéntica e Inclusiva de Vanguardia | Documento Corporativo Generado</div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", documentTemplate], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(filename || "documento_nora").toLowerCase().replace(/[^a-z0-9]/g, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToPdf(title: string, content: string) {
  if (typeof window === "undefined") return;
  const cleanBodyHtml = cleanMarkdown(content);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Nora Titán Universal</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; font-size: 11px; font-weight: bold; color: #1e3a8a; letter-spacing: 1px; display: flex; justify-content: space-between; }
          h1 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 20px; }
          h2 { color: #1e3a8a; font-size: 15px; margin-top: 20px; }
          h3 { color: #2563eb; font-size: 13px; margin-top: 15px; }
          p { text-align: justify; margin-bottom: 12px; font-size: 12px; color: #334155; }
          ul { margin-bottom: 12px; padding-left: 20px; }
          li { margin-bottom: 4px; font-size: 12px; color: #334155; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 9px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <span>NORA TITÁN UNIVERSAL — DOCUMENTO OFICIAL</span>
          <span>${new Date().toLocaleDateString("es-AR")}</span>
        </div>
        <h1>${title}</h1>
        <div>${cleanBodyHtml}</div>
        <div class="footer">Nora Titán Universal | Asistencia Agéntica e Inclusiva de Vanguardia</div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function exportToPptx(filename: string, title: string, content: string) {
  if (typeof window === "undefined") return;
  const sections = content.split(/\n#{1,3}\s+/).filter(Boolean);
  const slides = sections.length > 0 ? sections : [content];

  const slidesHtml = slides
    .map((slide, idx) => {
      const lines = slide.trim().split("\n");
      const slideTitle = lines[0] || `Diapositiva ${idx + 1}`;
      const slideBody = lines.slice(1).join("<br/>");
      return `
        <div class="slide">
          <div class="slide-header">NORA TITÁN UNIVERSAL — PRESENTACIÓN EJECUTIVA</div>
          <div class="slide-title">${slideTitle}</div>
          <div class="slide-content">${slideBody || slideTitle}</div>
          <div class="slide-footer">Diapositiva ${idx + 1} de ${slides.length}</div>
        </div>
      `;
    })
    .join("");

  const pptTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { margin: 0; padding: 20px; background: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; }
          .slide { width: 900px; height: 506px; background: #ffffff; margin: 20px auto; padding: 40px 50px; border-radius: 12px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .slide-header { font-size: 11px; font-weight: bold; color: #2563eb; letter-spacing: 1px; }
          .slide-title { font-size: 26px; font-weight: 800; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 14px; margin-top: 15px; }
          .slide-content { font-size: 15px; line-height: 1.6; color: #334155; margin-top: 20px; flex: 1; }
          .slide-footer { font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: right; }
        </style>
      </head>
      <body>
        ${slidesHtml}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", pptTemplate], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(filename || "presentacion_nora").toLowerCase().replace(/[^a-z0-9]/g, "_")}_slides.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
