// backend/src/services/pdfReportService.ts
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import {
  getCampaignDetailedResults,
  getAggregateReportData,
} from './campaignAnalyticsService.js';


function addHeader(doc: typeof PDFDocument, title: string, subtitle?: string) {
  doc
    .fontSize(20)
    .fillColor('#8b5cf6')
    .text(title, 50, 50, { align: 'left' })
    .fontSize(10)
    .fillColor('#64748b')
    .text(subtitle ?? '', 50, 75)
    .moveDown(2);
}

function addSection(doc: typeof PDFDocument, title: string) {
  doc
    .fontSize(14)
    .fillColor('#1e293b')
    .text(title, { underline: true })
    .moveDown(0.5);
}


function addTable(
  doc: typeof PDFDocument,
  headers: string[],
  rows: string[][]
) {
  const startX = 50;
  const startY = doc.y;
  const colWidth = (doc.page.width - 100) / headers.length;

  // Headers
  doc.fontSize(9).fillColor('#475569');
  headers.forEach((h, i) => {
    doc.text(h, startX + i * colWidth, startY, {
      width: colWidth - 5,
      align: 'left',
    });
  });

  doc.moveDown(0.3);
  doc
    .moveTo(startX, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke('#cbd5e1');
  doc.moveDown(0.3);

  // Rows
  doc.fontSize(8).fillColor('#1e293b');
  rows.forEach((row) => {
    const rowY = doc.y;
    row.forEach((cell, i) => {
      doc.text(cell, startX + i * colWidth, rowY, {
        width: colWidth - 5,
        align: 'left',
      });
    });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN REPORT PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCampaignPDF(campaignId: string): Promise<PassThrough> {
  const data = await getCampaignDetailedResults(campaignId);
  const doc  = new PDFDocument({ margin: 50 });
  const stream = new PassThrough();

  doc.pipe(stream);

  // Header
  addHeader(
    doc,
    `Campaign Report: ${data.campaign.name}`,
    `Type: ${data.campaign.type} | Status: ${data.campaign.status} | Generated: ${new Date().toLocaleString()}`
  );

  // Summary Section
  addSection(doc, 'Campaign Summary');
  const summaryData = [
    ['Total Targeted', data.summary.totalTargeted.toString()],
    ['Delivered',      data.summary.delivered.toString()],
    ['Clicked',        data.summary.clicked.toString()],
    ['Compromised',    data.summary.compromised.toString()],
    ['Reported',       data.summary.reported.toString()],
    ['Ignored',        data.summary.ignored.toString()],
    ['Click Rate',     `${data.summary.clickRate}%`],
    ['Compromise Rate',`${data.summary.compromiseRate}%`],
    ['Report Rate',    `${data.summary.reportRate}%`],
  ];
  addTable(doc, ['Metric', 'Value'], summaryData);

  // Department Breakdown
  if (Object.keys(data.byDepartment).length > 0) {
    addSection(doc, 'Department Breakdown');
    const deptRows = Object.entries(data.byDepartment).map(([dept, stats]: [string, any]) => [
      dept,
      stats.total.toString(),
      `${stats.clickRate}%`,
      `${stats.reportRate}%`,
      `${stats.compromiseRate}%`,
    ]);
    addTable(
      doc,
      ['Department', 'Total', 'Click %', 'Report %', 'Compromise %'],
      deptRows
    );
  }

  // Action Breakdown
  addSection(doc, 'Action Breakdown');
  const actionRows = [
    ['Compromised', data.byAction.compromised.length.toString()],
    ['Clicked Only', data.byAction.clicked.length.toString()],
    ['Reported',    data.byAction.reported.length.toString()],
    ['Ignored',     data.byAction.ignored.length.toString()],
  ];
  addTable(doc, ['Action', 'Count'], actionRows);

  // Risk Level Distribution
  addSection(doc, 'Risk Level Distribution');
  const riskRows = [
    ['High Risk',   data.byRiskLevel.high.length.toString()],
    ['Medium Risk', data.byRiskLevel.medium.length.toString()],
    ['Low Risk',    data.byRiskLevel.low.length.toString()],
  ];
  addTable(doc, ['Risk Level', 'Count'], riskRows);

  // New page for detailed user results
  doc.addPage();
  addHeader(doc, 'Detailed User Results', `Total: ${data.userActions.length} users`);

  const userRows = data.userActions.slice(0, 50).map((u) => [
    u.userName,
    u.department,
    u.action,
    u.riskLevel,
    `${u.riskScore}`,
  ]);
  addTable(
    doc,
    ['Name', 'Department', 'Action', 'Risk Level', 'Score'],
    userRows
  );

  if (data.userActions.length > 50) {
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text(`... and ${data.userActions.length - 50} more users`, { align: 'center' });
  }

  doc.end();
  return stream;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE REPORT PDF
// Weekly/Monthly/Department reports
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAggregatePDF(options: {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  departments?: string[];
}): Promise<PassThrough> {
  const data = await getAggregateReportData(options);
  const doc  = new PDFDocument({ margin: 50 });
  const stream = new PassThrough();

  doc.pipe(stream);

  // Header
  const periodText = options.startDate && options.endDate
    ? `${options.startDate.toLocaleDateString()} - ${options.endDate.toLocaleDateString()}`
    : 'All Time';
  
  addHeader(
    doc,
    'Security Awareness Aggregate Report',
    `Period: ${periodText} | Campaigns: ${data.period.totalCampaigns} | Generated: ${new Date().toLocaleString()}`
  );

  // Overall Summary
  addSection(doc, 'Overall Performance');
  const overallRows = [
    ['Total Simulations', data.overall.totalSimulations.toString()],
    ['Click Rate',        `${data.overall.clickRate}%`],
    ['Compromise Rate',   `${data.overall.compromiseRate}%`],
    ['Report Rate',       `${data.overall.reportRate}%`],
  ];
  addTable(doc, ['Metric', 'Value'], overallRows);

  // Department Breakdown
  if (data.departmentBreakdown.length > 0) {
    addSection(doc, 'Department Performance');
    const deptRows = data.departmentBreakdown.map((d: any) => [
      d.department,
      d.total.toString(),
      `${d.clickRate}%`,
      `${d.reportRate}%`,
      `${d.compromiseRate}%`,
    ]);
    addTable(
      doc,
      ['Department', 'Total', 'Click %', 'Report %', 'Compromise %'],
      deptRows
    );
  }

  // Simulation Type Breakdown
  if (data.simulationTypeBreakdown.length > 0) {
    addSection(doc, 'Simulation Type Performance');
    const typeRows = data.simulationTypeBreakdown.map((t: any) => [
      t.type,
      t.total.toString(),
      `${t.clickRate}%`,
      `${t.reportRate}%`,
      `${t.compromiseRate}%`,
    ]);
    addTable(
      doc,
      ['Type', 'Total', 'Click %', 'Report %', 'Compromise %'],
      typeRows
    );
  }

  // Campaign List
  if (data.campaigns.length > 0) {
    doc.addPage();
    addHeader(doc, 'Campaigns Included in Report', `Total: ${data.campaigns.length}`);
    const campaignRows = data.campaigns.map((c: any) => [
      c.name,
      c.type,
      c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A',
      c.status,
    ]);
    addTable(doc, ['Name', 'Type', 'Start Date', 'Status'], campaignRows);
  }

  doc.end();
  return stream;
}