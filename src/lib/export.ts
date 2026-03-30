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
  const worksheet = workbook.addWorksheet('NHAP_LIEU');

  // Define columns
  const columns = [
    { header: 'STT', key: 'stt', width: 5 },
    { header: 'Thời gian', key: 'thoiGian', width: 15 },
    { header: 'Địa điểm', key: 'diaDiem', width: 20 },
    { header: 'Nội dung', key: 'noiDung', width: 30 },
    { header: 'Hình thức', key: 'hinhThuc', width: 20 },
    { header: 'Đơn vị', key: 'unitName', width: 20 },
    { header: 'Đối tượng', key: 'doiTuong', width: 20 },
    { header: 'Số người', key: 'soNguoi', width: 10 },
    { header: 'Phương tiện', key: 'phuongTien', width: 20 },
    { header: 'Thời lượng', key: 'thoiLuong', width: 15 },
    { header: 'Người thực hiện', key: 'staff', width: 20 },
    { header: 'Ký xác nhận', key: 'signature', width: 15 },
    { header: 'Ghi chú', key: 'ghiChu', width: 20 },
  ];
  worksheet.columns = columns;

  // Style header
  worksheet.getRow(1).font = { bold: true, name: FONT_FAMILY, size: FONT_SIZE_PT };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Add data
  records.forEach((record) => {
    worksheet.addRow({
      ...record,
      thoiGian: safeFormat(record.thoiGian, 'dd/MM/yyyy'),
      unitName: UNITS.find(u => u.id === record.unitId)?.name || 'N/A',
    });
  });

  // Add report sheet
  const reportSheet = workbook.addWorksheet('BAO_CAO');
  reportSheet.addRow(['SỔ THEO DÕI TRUYỀN THÔNG GDSK']);
  reportSheet.addRow(['Trạm Y tế Cái Bầu']);
  reportSheet.addRow(['Thời gian:', reportTitle]);
  reportSheet.addRow([]);
  
  reportSheet.addRow(['I. TỔNG HỢP CHUNG']);
  reportSheet.addRow(['Tổng số buổi', records.length]);
  reportSheet.addRow(['Tổng số người', records.reduce((sum, r) => sum + Number(r.soNguoi || 0), 0)]);
  reportSheet.addRow([]);
  
  reportSheet.addRow(['II. PHÂN LOẠI THEO HÌNH THỨC']);
  reportSheet.addRow(['Hình thức', 'Số buổi', 'Số người']);
  
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
  
  Object.entries(byType).forEach(([type, val]) => {
    reportSheet.addRow([type, val.sessions, val.people]);
  });

  if (isAdmin) {
    reportSheet.addRow([]);
    reportSheet.addRow(['III. PHÂN LOẠI THEO ĐƠN VỊ']);
    reportSheet.addRow(['Đơn vị', 'Số buổi', 'Số người']);
    Object.entries(byUnit).forEach(([unit, val]) => {
      reportSheet.addRow([unit, val.sessions, val.people]);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Bao_cao_GDSK_${reportTitle.replace(/\//g, '-')}.xlsx`);
};

export const exportToWord = async (records: HealthCommunicationRecord[], reportTitle: string, isAdmin: boolean = false) => {
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

  const createTableCell = (text: string, bold: boolean = false, alignment: any = AlignmentType.LEFT) => new TableCell({
    children: [new Paragraph({ 
      children: [new TextRun({ text, bold, font: FONT_FAMILY, size: FONT_SIZE_DOCX })],
      alignment
    })],
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 }
  });

  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: "SỔ THEO DÕI TRUYỀN THÔNG GDSK", bold: true, size: 36, font: FONT_FAMILY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: "Trạm Y tế Cái Bầu", bold: true, size: 28, font: FONT_FAMILY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Thời gian: ${reportTitle}`, italics: true, size: 28, font: FONT_FAMILY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: "I. TỔNG HỢP CHUNG", bold: true, size: 28, font: FONT_FAMILY })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `1. Tổng số buổi: ${records.length}`, size: 28, font: FONT_FAMILY })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `2. Tổng số người: ${records.reduce((sum, r) => sum + Number(r.soNguoi || 0), 0)}`, size: 28, font: FONT_FAMILY })],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: "II. PHÂN LOẠI THEO HÌNH THỨC", bold: true, size: 28, font: FONT_FAMILY })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ["Hình thức", "Số buổi", "Số người"].map(text => createTableCell(text, true, AlignmentType.CENTER))
        }),
        ...Object.entries(byType).map(([type, val]) => new TableRow({
          children: [
            createTableCell(type),
            createTableCell(val.sessions.toString(), false, AlignmentType.CENTER),
            createTableCell(val.people.toString(), false, AlignmentType.CENTER)
          ]
        }))
      ]
    }),
    new Paragraph({ text: "" }),
  ];

  if (isAdmin) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "III. PHÂN LOẠI THEO ĐƠN VỊ", bold: true, size: 28, font: FONT_FAMILY })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ["Đơn vị", "Số buổi", "Số người"].map(text => createTableCell(text, true, AlignmentType.CENTER))
          }),
          ...Object.entries(byUnit).map(([unit, val]) => new TableRow({
            children: [
              createTableCell(unit),
              createTableCell(val.sessions.toString(), false, AlignmentType.CENTER),
              createTableCell(val.people.toString(), false, AlignmentType.CENTER)
            ]
          }))
        ]
      }),
      new Paragraph({ text: "" }),
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${isAdmin ? 'IV' : 'III'}. CHI TIẾT CÁC HOẠT ĐỘNG`, bold: true, size: 28, font: FONT_FAMILY })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            "STT", "Thời gian", "Địa điểm", "Nội dung", "Hình thức", "Đơn vị", "Đối tượng", "Số người", "Phương tiện", "Thời lượng", "Người thực hiện", "Ký xác nhận"
          ].map(text => createTableCell(text, true, AlignmentType.CENTER)),
        }),
        ...records.map(record => new TableRow({
          children: [
            record.stt.toString(),
            safeFormat(record.thoiGian, 'dd/MM/yyyy'),
            record.diaDiem,
            record.noiDung,
            record.hinhThuc,
            UNITS.find(u => u.id === record.unitId)?.name || 'N/A',
            record.doiTuong,
            record.soNguoi.toString(),
            record.phuongTien,
            record.thoiLuong,
            record.staff,
            record.signature || ""
          ].map(text => createTableCell(text, false, AlignmentType.LEFT)),
        }))
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
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
                  children: [new TextRun({ text: "Người lập", bold: true, font: FONT_FAMILY, size: 28 })],
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
                  children: [new TextRun({ text: "Trưởng trạm", bold: true, font: FONT_FAMILY, size: 28 })],
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
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: {
            top: 1134, // 2cm
            bottom: 1134, // 2cm
            left: 1701, // 3cm
            right: 1134, // 2cm
          },
        },
      },
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Bao_cao_GDSK_${reportTitle.replace(/\//g, '-')}.docx`);
};

export const exportToPDF = async (records: HealthCommunicationRecord[], reportTitle: string, isAdmin: boolean = false) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  // Note: Standard fonts in jsPDF don't support Vietnamese well.
  // In a real app, we would embed a Unicode font here.
  // For now, we use 'helvetica' which has better support for some diacritics than 'times'.
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

  const tableColumn = ["STT", "Thời gian", "Địa điểm", "Nội dung", "Hình thức", "Đơn vị", "Đối tượng", "Số người", "Phương tiện", "Thời lượng", "Người thực hiện", "Ký xác nhận"];
  const tableRows = records.map(row => [
    row.stt,
    safeFormat(row.thoiGian, 'dd/MM/yyyy'),
    row.diaDiem,
    row.noiDung,
    row.hinhThuc,
    UNITS.find(u => u.id === row.unitId)?.name || 'N/A',
    row.doiTuong,
    row.soNguoi,
    row.phuongTien,
    row.thoiLuong,
    row.staff,
    row.signature || ""
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
