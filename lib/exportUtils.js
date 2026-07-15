import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// I will use html2pdf dynamically for PDF exports

export const exportToExcelAdvanced = async (
  data,
  filename,
  sheetName = "Reporte",
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Get keys from first object
    if (!data || data.length === 0) {
      console.warn("No data provided for export");
      alert("No hay datos disponibles para exportar.");
      return;
    }
    const keys = Object.keys(data[0]);

    // Add headers
    worksheet.addRow(keys.map((k) => k.toUpperCase().replace(/_/g, " ")));

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "3b82f6" },
      };
      cell.font = { color: { argb: "FFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add data
    data.forEach((item) => {
      worksheet.addRow(keys.map((k) => item[k]));
    });

    // Adjust column widths
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Generate blob and download using file-saver
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    
    saveAs(blob, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
  } catch (error) {
    console.error("Error exportando a Excel:", error);
    alert("Hubo un error al exportar a Excel. Revisa la consola para más detalles.");
  }
};

export const exportToPDFAdvanced = (elementId, filename) => {
  // We can use html2pdf dynamically for client-side rendering
  import("html2pdf.js").then((html2pdfModule) => {
    const html2pdf = html2pdfModule.default;
    const element = document.getElementById(elementId);
    if (!element) {
      console.error("Elemento no encontrado para exportar");
      return;
    }

    const opt = {
      margin: 0.5,
      filename: `${filename}_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
    };

    html2pdf().set(opt).from(element).save();
  });
};
