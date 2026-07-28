const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Attendance, Employee, Department, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Generate PDF attendance report for a given month with pixel-perfect alignment
 */
async function generateAttendancePDF(res, month) {
  const [year, mon] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const records = await Attendance.findAll({
    where: {
      date: { [Op.between]: [startDate, endDate] }
    },
    include: [{
      model: Employee,
      as: 'employee',
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: Department, as: 'department', attributes: ['name', 'code'] }
      ]
    }],
    order: [['date', 'ASC']]
  });

  const totalRecords = records.length;
  const hadirCount = records.filter(r => r.status === 'Hadir' || r.status === 'Present').length;
  const terlambatCount = records.filter(r => r.status === 'Terlambat' || r.status === 'Late').length;
  const izinCount = records.filter(r => r.status === 'Izin' || r.status === 'Leave').length;
  const sakitCount = records.filter(r => r.status === 'Sakit' || r.status === 'Sick').length;
  const alpaCount = records.filter(r => r.status === 'Alpa' || r.status === 'Absent').length;

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  const filename = `Laporan_Presensi_Bigland_${month}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // --- HEADER KOP SURAT ---
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#0F172A')
    .text('BIGLAND HOTEL & CONVENTION SENTUL', { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#475569')
    .text('Jl. Olympic Raya Sentul No. 8, Babakan Madang, Bogor, Jawa Barat 16810 | Telp: +62 21 8795 4000', { align: 'center' });
  doc.text('Email: hrd@biglandsentulhotel.com | Website: www.biglandsentulhotel.com', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(1.5).strokeColor('#0F172A').stroke();
  doc.moveDown(0.6);

  // --- JUDUL LAPORAN ---
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0F172A')
    .text(`LAPORAN REKAPITULASI PRESENSI KARYAWAN`, { align: 'center' });
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#D97706')
    .text(`PERIODE: ${monthNames[mon].toUpperCase()} ${year}`, { align: 'center' });
  doc.moveDown(1);

  // --- RINGKASAN STATISTIK (DENGAN TABEL DUA KOLOM DENGAN TITIK DUA PRESISI ALIGNED) ---
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('RINGKASAN STATISTIK PRESENSI:', 40);
  doc.moveDown(0.4);

  const statsList = [
    { label: 'Total Record Presensi', val: `${totalRecords} Absensi` },
    { label: 'Hadir Tepat Waktu', val: `${hadirCount} Karyawan (${totalRecords > 0 ? Math.round(hadirCount / totalRecords * 100) : 0}%)` },
    { label: 'Terlambat Absen', val: `${terlambatCount} Karyawan (${totalRecords > 0 ? Math.round(terlambatCount / totalRecords * 100) : 0}%)` },
    { label: 'Izin Disetujui', val: `${izinCount} Karyawan (${totalRecords > 0 ? Math.round(izinCount / totalRecords * 100) : 0}%)` },
    { label: 'Sakit', val: `${sakitCount} Karyawan (${totalRecords > 0 ? Math.round(sakitCount / totalRecords * 100) : 0}%)` },
    { label: 'Alpa / Tanpa Keterangan', val: `${alpaCount} Karyawan (${totalRecords > 0 ? Math.round(alpaCount / totalRecords * 100) : 0}%)` }
  ];

  let currentY = doc.y;
  statsList.forEach(item => {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#334155').text(item.label, 45, currentY, { width: 170 });
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0F172A').text(':', 215, currentY);
    doc.fontSize(9.5).font('Helvetica').fillColor('#0F172A').text(item.val, 225, currentY);
    currentY += 16;
  });

  doc.y = currentY + 12;

  // --- DETAIL PRESENSI TABLE ---
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('DETAIL REKAPITULASI PRESENSI:', 40, doc.y);
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colX = [40, 100, 205, 305, 365, 425, 485];
  const colHeaders = ['Tanggal', 'Nama Karyawan', 'Departemen', 'Masuk', 'Pulang', 'Status', 'Ket.'];

  doc.fontSize(8.5).font('Helvetica-Bold');
  doc.rect(38, tableTop - 2, 517, 18).fill('#0F172A');
  doc.fillColor('#FFFFFF');
  colHeaders.forEach((header, i) => {
    doc.text(header, colX[i], tableTop + 2, { width: (colX[i + 1] || 555) - colX[i] - 2 });
  });

  let rowY = tableTop + 20;

  doc.font('Helvetica').fontSize(8);
  records.forEach((record, idx) => {
    if (rowY > 740) {
      doc.addPage();
      rowY = 50;
    }

    if (idx % 2 === 0) {
      doc.rect(38, rowY - 2, 517, 16).fill('#F8FAFC');
    }

    doc.fillColor('#0F172A');
    const empName = record.employee?.user?.name || 'Karyawan';
    const deptName = record.employee?.department?.name || 'Operasional';
    const rowData = [
      record.date,
      empName.length > 20 ? empName.substring(0, 18) + '..' : empName,
      deptName.length > 16 ? deptName.substring(0, 14) + '..' : deptName,
      record.check_in || '-',
      record.check_out || '-',
      record.status,
      (record.notes || '-').substring(0, 12)
    ];

    rowData.forEach((text, i) => {
      doc.text(String(text), colX[i], rowY + 1, { width: (colX[i + 1] || 555) - colX[i] - 2 });
    });

    rowY += 16;
  });

  if (records.length === 0) {
    doc.fontSize(9).fillColor('#64748B').text('Tidak ada data presensi pada periode bulan ini.', 40, rowY + 10);
  }

  // --- SIGNATURE FOOTER ---
  if (rowY > 660) {
    doc.addPage();
    rowY = 50;
  } else {
    rowY += 30;
  }

  doc.fontSize(9).font('Helvetica').fillColor('#475569');
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`, 40, rowY);
  doc.text('Dokumen Resmi Sistem HRIS Bigland Hotel Sentul', 40, rowY + 14);

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A');
  doc.text('Human Resources Manager', 380, rowY, { align: 'center', width: 170 });
  doc.moveDown(3);
  doc.text('__________________________', 380, rowY + 50, { align: 'center', width: 170 });
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
  doc.text('PT Bigland Hotel & Convention Sentul', 380, rowY + 64, { align: 'center', width: 170 });

  doc.end();
}

/**
 * Generate Excel attendance report for a given month with professional formatting
 */
async function generateAttendanceExcel(res, month) {
  const [year, mon] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const records = await Attendance.findAll({
    where: {
      date: { [Op.between]: [startDate, endDate] }
    },
    include: [{
      model: Employee,
      as: 'employee',
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: Department, as: 'department', attributes: ['name', 'code'] }
      ]
    }],
    order: [['date', 'ASC']]
  });

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bigland HRIS System';
  workbook.created = new Date();

  // ---- SHEET 1: RINGKASAN PRESENSI ----
  const summarySheet = workbook.addWorksheet('Ringkasan Presensi', {
    properties: { tabColor: { argb: 'FF0F172A' } }
  });

  // Set explicit column widths
  summarySheet.columns = [
    { key: 'colA', width: 28 },
    { key: 'colB', width: 18 },
    { key: 'colC', width: 18 },
    { key: 'colD', width: 35 }
  ];

  // Header Title
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BIGLAND HOTEL & CONVENTION SENTUL';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 30;

  summarySheet.mergeCells('A2:D2');
  const subTitleCell = summarySheet.getCell('A2');
  subTitleCell.value = `LAPORAN REKAPITULASI PRESENSI PERIODE ${monthNames[mon].toUpperCase()} ${year}`;
  subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFD97706' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 24;

  summarySheet.addRow([]); // Row 3 Empty

  // Section Header
  summarySheet.mergeCells('A4:D4');
  const secTitle = summarySheet.getCell('A4');
  secTitle.value = 'RINGKASAN STATISTIK KEHADIRAN KARYAWAN';
  secTitle.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  secTitle.alignment = { horizontal: 'left', vertical: 'middle' };
  summarySheet.getRow(4).height = 22;

  // Table Headers
  const statsHeadersRow = summarySheet.addRow(['Status Kehadiran', 'Jumlah Record', 'Persentase', 'Keterangan Evaluasi']);
  statsHeadersRow.height = 24;
  statsHeadersRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  const totalRecords = records.length;
  const hadirCount = records.filter(r => r.status === 'Hadir' || r.status === 'Present').length;
  const terlambatCount = records.filter(r => r.status === 'Terlambat' || r.status === 'Late').length;
  const izinCount = records.filter(r => r.status === 'Izin' || r.status === 'Leave').length;
  const sakitCount = records.filter(r => r.status === 'Sakit' || r.status === 'Sick').length;
  const alpaCount = records.filter(r => r.status === 'Alpa' || r.status === 'Absent').length;

  const rowsData = [
    ['Total Record Presensi', totalRecords, '100%', 'Total akumulasi seluruh absensi'],
    ['Hadir Tepat Waktu', hadirCount, totalRecords > 0 ? `${Math.round(hadirCount / totalRecords * 100)}%` : '0%', 'Presensi sesuai jam operasional'],
    ['Terlambat Absen', terlambatCount, totalRecords > 0 ? `${Math.round(terlambatCount / totalRecords * 100)}%` : '0%', 'Melewati batas toleransi shift'],
    ['Izin Disetujui', izinCount, totalRecords > 0 ? `${Math.round(izinCount / totalRecords * 100)}%` : '0%', 'Permohonan izin/cuti resmi'],
    ['Sakit', sakitCount, totalRecords > 0 ? `${Math.round(sakitCount / totalRecords * 100)}%` : '0%', 'Surat keterangan dokter'],
    ['Alpa / Tanpa Keterangan', alpaCount, totalRecords > 0 ? `${Math.round(alpaCount / totalRecords * 100)}%` : '0%', 'Tidak melapor presensi']
  ];

  rowsData.forEach((data, index) => {
    const row = summarySheet.addRow(data);
    row.height = 20;

    const isTotal = index === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9.5, bold: isTotal };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      if (colNumber === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (colNumber === 2 || colNumber === 3) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      if (index % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // ---- SHEET 2: DETAIL REKAP PRESENSI ----
  const detailSheet = workbook.addWorksheet('Detail Log Presensi', {
    properties: { tabColor: { argb: 'FFD97706' } }
  });

  detailSheet.columns = [
    { key: 'no', width: 6 },
    { key: 'date', width: 14 },
    { key: 'nip', width: 15 },
    { key: 'name', width: 26 },
    { key: 'dept', width: 20 },
    { key: 'checkIn', width: 14 },
    { key: 'checkOut', width: 14 },
    { key: 'status', width: 15 },
    { key: 'location', width: 25 },
    { key: 'notes', width: 25 }
  ];

  // Header Title Row Detail
  detailSheet.mergeCells('A1:J1');
  const dTitle = detailSheet.getCell('A1');
  dTitle.value = `LOG DETAIL PRESENSI KARYAWAN - ${monthNames[mon].toUpperCase()} ${year}`;
  dTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  detailSheet.getRow(1).height = 28;

  // Table Headers Detail
  const dHeaders = detailSheet.addRow([
    'No', 'Tanggal', 'NIP', 'Nama Karyawan', 'Departemen', 
    'Jam Masuk', 'Jam Pulang', 'Status', 'Lokasi Presensi', 'Keterangan'
  ]);
  dHeaders.height = 24;
  dHeaders.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  records.forEach((record, idx) => {
    const row = detailSheet.addRow([
      idx + 1,
      record.date,
      record.employee?.employee_id || '-',
      record.employee?.user?.name || 'Karyawan',
      record.employee?.department?.name || 'Operasional',
      record.check_in || '-',
      record.check_out || '-',
      record.status,
      record.location || 'Kiosk Lobi',
      record.notes || '-'
    ]);
    row.height = 20;

    row.eachCell((cell, colIndex) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      
      if (colIndex === 1 || colIndex === 2 || colIndex === 3 || colIndex === 6 || colIndex === 7 || colIndex === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      if (idx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    // Style Status Cell
    const statusCell = row.getCell(8);
    if (record.status === 'Hadir' || record.status === 'Present') {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
    } else if (record.status === 'Terlambat' || record.status === 'Late') {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
    } else if (record.status === 'Izin' || record.status === 'Leave') {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0284C7' } };
    } else if (record.status === 'Alpa' || record.status === 'Absent') {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFBE123C' } };
    }
  });

  const filename = `Laporan_Presensi_Bigland_${month}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { generateAttendancePDF, generateAttendanceExcel };
