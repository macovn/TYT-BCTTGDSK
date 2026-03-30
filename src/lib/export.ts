import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  TextRun, 
  VerticalAlign, 
  PageOrientation, 
  BorderStyle 
} from 'docx';
import { HealthCommunicationRecord, UNITS } from '../types';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const FONT_SIZE_PT = 14;
const FONT_SIZE_DOCX = 28; // 14pt * 2
const FONT_FAMILY = "Times New Roman";

const safeFormat = (dateStr: string, formatStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, formatStr);
  } catch (e) {
    return 'N/A';
  }
};

export const exportToExcel = async (records: HealthCommunicationRecord[], reportTitle: string, isAdmin: boolean = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BaoCao');

  // 1. HEADER & TITLE
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'SỔ THEO DÕI TRUYỀN THÔNG GDSK';
  titleCell.font = { name: FONT_FAMILY, size: 16, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:L2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `Thời gian: ${reportTitle}`;
  subtitleCell.font = { name: FONT_FAMILY, size: 12, italic: true };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]); // Empty row 3

  // 2. TABLE HEADER (Row 4)
  const headerRow = worksheet.addRow([
    "STT",
    "Thời gian",
    "Địa điểm",
    "Nội dung",
    "Hình thức",
    "Đối tượng",
    "Số người",
    "Thời lượng",
    "Phương tiện",
    "Người thực hiện",
    "Ký xác nhận",
    "Ghi chú"
  ]);

  headerRow.eachCell((cell) => {
    cell.font = { name: FONT_FAMILY, size: 11, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F2F2F2' }
    };
  });

  // 3. DATA ROWS
  records.forEach((item, index) => {
    const row = worksheet.addRow([
      index + 1,
      safeFormat(item.thoiGian, 'dd/MM/yyyy'),
      item.diaDiem || "",
      item.noiDung || "",
      item.hinhThuc || "",
      item.doiTuong || "",
      Number(item.soNguoi || 0),
      item.thoiLuong || "",
      item.phuongTien || "",
      item.staff || "",
      item.signature || "",
      item.ghiChu || ""
    ]);

    row.eachCell((cell) => {
      cell.font = { name: FONT_FAMILY, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    // Left align for content-heavy cells
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });

  // 4. TOTAL ROW
  const totalPeople = records.reduce((sum, r) => sum + Number(r.soNguoi || 0), 0);
  const totalRow = worksheet.addRow([
    "TỔNG CỘNG",
    "", "", "", "", "",
    totalPeople,
    "", "", "", "", ""
  ]);

  worksheet.mergeCells(`A${totalRow.number}:F${totalRow.number}`);
  totalRow.getCell(1).font = { name: FONT_FAMILY, size: 11, bold: true };
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  totalRow.getCell(7).font = { name: FONT_FAMILY, size: 11, bold: true };
  
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 5. COLUMN WIDTHS
  worksheet.columns = [
    { width: 5 },   // STT
    { width: 15 },  // Thời gian
    { width: 25 },  // Địa điểm
    { width: 35 },  // Nội dung
    { width: 20 },  // Hình thức
    { width: 20 },  // Đối tượng
    { width: 12 },  // Số người
    { width: 15 },  // Thời lượng
    { width: 20 },  // Phương tiện
    { width: 20 },  // Người thực hiện
    { width: 15 },  // Ký xác nhận
    { width: 20 }   // Ghi chú
  ];

  // 6. FOOTER (Signatures)
  worksheet.addRow([]);
  const signRow = worksheet.addRow([]);
  const currentRow = signRow.number + 1;
  
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const makerCell = worksheet.getCell(`A${currentRow}`);
  makerCell.value = 'Người lập biểu';
  makerCell.font = { name: FONT_FAMILY, size: 11, bold: true };
  makerCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${currentRow}:L${currentRow}`);
  const leaderCell = worksheet.getCell(`G${currentRow}`);
  leaderCell.value = 'Trưởng đơn vị';
  leaderCell.font = { name: FONT_FAMILY, size: 11, bold: true };
  leaderCell.alignment = { horizontal: 'center' };

  const signSubRow = currentRow + 1;
  worksheet.mergeCells(`A${signSubRow}:F${signSubRow}`);
  worksheet.getCell(`A${signSubRow}`).value = '(Ký, ghi rõ họ tên)';
  worksheet.getCell(`A${signSubRow}`).font = { name: FONT_FAMILY, size: 10, italic: true };
  worksheet.getCell(`A${signSubRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${signSubRow}:L${signSubRow}`);
  worksheet.getCell(`G${signSubRow}`).value = '(Ký tên, đóng dấu)';
  worksheet.getCell(`G${signSubRow}`).font = { name: FONT_FAMILY, size: 10, italic: true };
  worksheet.getCell(`G${signSubRow}`).alignment = { horizontal: 'center' };

  // 7. EXPORT
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `So_Truyen_Thong_GDSK_${reportTitle.replace(/\//g, '-')}.xlsx`);
};

export const exportToWord = async (records: HealthCommunicationRecord[], reportTitle: string, isAdmin: boolean = false) => {
  const createTableCell = (text: any, bold: boolean = false, alignment: any = AlignmentType.LEFT) => new TableCell({
    children: [new Paragraph({ 
      children: [new TextRun({ text: String(text || ""), bold, font: FONT_FAMILY, size: 24 })], // 12pt
      alignment
    })],
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 }
  });

  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: "SỔ THEO DÕI TRUYỀN THÔNG GDSK", bold: true, size: 28, font: FONT_FAMILY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `THỜI GIAN: ${reportTitle.toUpperCase()}`, bold: true, size: 28, font: FONT_FAMILY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            "STT", "Thời gian", "Địa điểm", "Nội dung", "Hình thức", "Đối tượng", "Số người", "Thời lượng", "Phương tiện", "Người thực hiện", "Ký xác nhận", "Ghi chú"
          ].map(text => createTableCell(text, true, AlignmentType.CENTER)),
        }),
        ...records.map(record => new TableRow({
          children: [
            String(record.stt || ""),
            safeFormat(record.thoiGian, 'yyyy-MM-dd'),
            String(record.diaDiem || ""),
            String(record.noiDung || ""),
            String(record.hinhThuc || ""),
            String(record.doiTuong || ""),
            String(record.soNguoi || 0),
            String(record.thoiLuong || ""),
            String(record.phuongTien || ""),
            String(record.staff || ""),
            String(record.signature || ""),
            String(record.ghiChu || "")
          ].map(text => createTableCell(text, false, AlignmentType.CENTER)),
        }))
      ],
    }),
    new Paragraph({ text: "", spacing: { before: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Người lập sổ", bold: true, font: FONT_FAMILY, size: 28 })],
                  alignment: AlignmentType.CENTER
                }),
                new Paragraph({
                  children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true, font: FONT_FAMILY, size: 24 })],
                  alignment: AlignmentType.CENTER
                })
              ],
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Ngày ...... tháng ...... năm 20...", italics: true, font: FONT_FAMILY, size: 24 })],
                  alignment: AlignmentType.CENTER
                }),
                new Paragraph({
                  children: [new TextRun({ text: "Trưởng đơn vị", bold: true, font: FONT_FAMILY, size: 28 })],
                  alignment: AlignmentType.CENTER
                }),
                new Paragraph({
                  children: [new TextRun({ text: "(Ký tên, đóng dấu)", italics: true, font: FONT_FAMILY, size: 24 })],
                  alignment: AlignmentType.CENTER
                })
              ],
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            })
          ]
        })
      ]
    })
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: {
            top: 720, // 1.27cm
            bottom: 720,
            left: 720,
            right: 720,
          },
        },
      },
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `So_Theo_Doi_GDSK_${reportTitle.replace(/\//g, '-')}.docx`);
};

export const exportToPDF = async (records: HealthCommunicationRecord[], reportTitle: string, isAdmin: boolean = false) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const font = "helvetica";

  // Header
  doc.setFont(font, "bold");
  doc.setFontSize(18);
  doc.text("SỔ THEO DÕI TRUYỀN THÔNG GDSK", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
  
  doc.setFontSize(14);
  doc.text("Trạm Y tế Cái Bầu", doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
  
  doc.setFont(font, "italic");
  doc.setFontSize(12);
  doc.text(`Thời gian: ${reportTitle}`, doc.internal.pageSize.getWidth() / 2, 28, { align: "center" });

  // I. Summary
  doc.setFont(font, "bold");
  doc.setFontSize(14);
  doc.text("I. TỔNG HỢP CHUNG", 15, 40);
  
  doc.setFont(font, "normal");
  doc.setFontSize(12);
  doc.text(`1. Tổng số buổi truyền thông: ${records.length}`, 15, 48);
  doc.text(`2. Tổng số lượt người tham gia: ${records.reduce((sum, r) => sum + Number(r.soNguoi || 0), 0)}`, 15, 54);

  // II. Classification
  const byType: Record<string, { sessions: number; people: number }> = {};
  const byUnit: Record<string, { sessions: number; people: number }> = {};

  records.forEach(item => {
    const type = item.hinhThuc || "Khác";
    if (!byType[type]) byType[type] = { sessions: 0, people: 0 };
    byType[type].sessions += 1;
    byType[type].people += Number(item.soNguoi || 0);

    const unit = UNITS.find(u => u.id === item.unitId)?.name || "Không xác định";
    if (!byUnit[unit]) byUnit[unit] = { sessions: 0, people: 0 };
    byUnit[unit].sessions += 1;
    byUnit[unit].people += Number(item.soNguoi || 0);
  });

  doc.setFont(font, "bold");
  doc.text("II. PHÂN LOẠI THEO HÌNH THỨC", 15, 65);
  
  (doc as any).autoTable({
    head: [["Hình thức", "Số buổi", "Số người"]],
    body: Object.entries(byType).map(([type, val]) => [type, val.sessions, val.people]),
    startY: 70,
    theme: 'grid',
    styles: { font: font, fontSize: 11 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  let finalY = (doc as any).lastAutoTable.finalY || 70;

  if (isAdmin) {
    doc.setFont(font, "bold");
    doc.text("III. PHÂN LOẠI THEO ĐƠN VỊ", 15, finalY + 10);
    (doc as any).autoTable({
      head: [["Đơn vị", "Số buổi", "Số người"]],
      body: Object.entries(byUnit).map(([unit, val]) => [unit, val.sessions, val.people]),
      startY: finalY + 15,
      theme: 'grid',
      styles: { font: font, fontSize: 11 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    finalY = (doc as any).lastAutoTable.finalY || finalY + 15;
  }

  // III/IV. Detailed
  doc.setFont(font, "bold");
  doc.text(`${isAdmin ? 'IV' : 'III'}. CHI TIẾT CÁC HOẠT ĐỘNG`, 15, finalY + 10);

  const tableColumn = ["STT", "Thời gian", "Địa điểm", "Nội dung", "Hình thức", "Đối tượng", "Số người", "Thời lượng", "Phương tiện", "Người thực hiện", "Ký xác nhận", "Ghi chú"];
  const tableRows = records.map(row => [
    row.stt,
    safeFormat(row.thoiGian, 'dd/MM/yyyy'),
    row.diaDiem,
    row.noiDung,
    row.hinhThuc,
    row.doiTuong,
    row.soNguoi,
    row.thoiLuong,
    row.phuongTien,
    row.staff,
    row.signature || "",
    row.ghiChu || ""
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: finalY + 15,
    theme: 'grid',
    styles: { font: font, fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  finalY = (doc as any).lastAutoTable.finalY || finalY + 15;

  // Footer
  if (finalY + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont(font, "bold");
  doc.text("Người lập", 50, finalY + 15, { align: "center" });
  doc.setFont(font, "italic");
  doc.setFontSize(10);
  doc.text("(Ký, ghi rõ họ tên)", 50, finalY + 20, { align: "center" });

  doc.setFont(font, "bold");
  doc.setFontSize(12);
  doc.text("Trưởng trạm", doc.internal.pageSize.getWidth() - 50, finalY + 15, { align: "center" });
  doc.setFont(font, "italic");
  doc.setFontSize(10);
  doc.text("(Ký tên, đóng dấu)", doc.internal.pageSize.getWidth() - 50, finalY + 20, { align: "center" });

  doc.save(`Bao_cao_GDSK_${reportTitle.replace(/\//g, '-')}.pdf`);
};
