import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, TextRun, VerticalAlign, BorderStyle, PageOrientation, LineRuleType } from 'docx';
import { HealthCommunicationRecord } from '../types';
import { format } from 'date-fns';

export const exportToExcel = async (records: HealthCommunicationRecord[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('NHAP_LIEU');

  // Define columns
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 5 },
    { header: 'Thời gian', key: 'thoiGian', width: 15 },
    { header: 'Địa điểm', key: 'diaDiem', width: 20 },
    { header: 'Nội dung', key: 'noiDung', width: 30 },
    { header: 'Hình thức', key: 'hinhThuc', width: 20 },
    { header: 'Đối tượng', key: 'doiTuong', width: 20 },
    { header: 'Số người', key: 'soNguoi', width: 10 },
    { header: 'Phương tiện', key: 'phuongTien', width: 20 },
    { header: 'Thời lượng', key: 'thoiLuong', width: 15 },
    { header: 'Người thực hiện', key: 'nguoiThucHien', width: 20 },
    { header: 'Ghi chú', key: 'ghiChu', width: 20 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Add data
  records.forEach((record) => {
    worksheet.addRow({
      ...record,
      thoiGian: format(new Date(record.thoiGian), 'dd/MM/yyyy'),
    });
  });

  // Add category sheet
  const categorySheet = workbook.addWorksheet('DANH_MUC');
  categorySheet.addRow(['Hình thức', 'Đối tượng', 'Phương tiện']);
  // ... (could add options here)

  // Add report sheet (simplified)
  const reportSheet = workbook.addWorksheet('BAO_CAO_THANG');
  reportSheet.addRow(['Tổng số buổi', records.length]);
  reportSheet.addRow(['Tổng số người', records.reduce((sum, r) => sum + r.soNguoi, 0)]);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'So_A11_TYT.xlsx');
};

export const exportToWord = async (records: HealthCommunicationRecord[]) => {
  const tableHeader = new TableRow({
    children: [
      "STT", "Thời gian", "Địa điểm", "Nội dung", "Hình thức", "Đối tượng", "Số người", "Phương tiện", "Thời lượng", "Người thực hiện", "Ghi chú"
    ].map(text => new TableCell({
      children: [new Paragraph({ 
        children: [new TextRun({ text, bold: true, font: "Times New Roman", size: 28 })],
        alignment: AlignmentType.CENTER 
      })],
      verticalAlign: VerticalAlign.CENTER,
    })),
  });

  const tableRows = records.map(record => new TableRow({
    children: [
      record.stt.toString(),
      format(new Date(record.thoiGian), 'dd/MM/yyyy'),
      record.diaDiem,
      record.noiDung,
      record.hinhThuc,
      record.doiTuong,
      record.soNguoi.toString(),
      record.phuongTien,
      record.thoiLuong,
      record.nguoiThucHien,
      record.ghiChu
    ].map(text => new TableCell({
      children: [new Paragraph({ 
        children: [new TextRun({ text, font: "Times New Roman", size: 28 })]
      })],
    })),
  }));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 28, // 14pt
          },
          paragraph: {
            spacing: {
              before: 120, // 6pt
              after: 120, // 6pt
              line: 320, // 16pt (Exactly)
              lineRule: LineRuleType.EXACT,
            },
          },
        },
      },
    },
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
      children: [
        new Paragraph({
          children: [new TextRun({ text: "SỔ THEO DÕI TRUYỀN THÔNG GDSK", bold: true, size: 36 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: "Trạm Y tế: ....................................", size: 28 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: "Năm: .................", size: 28 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }), // Spacer
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [tableHeader, ...tableRows],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'So_A11_TYT.docx');
};
