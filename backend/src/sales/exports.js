import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Readable } from 'node:stream';
import { resources } from './config.js';
import { fail } from './security.js';
const safeText=(value)=>{const text=String(value ?? '');return /^[=+\-@\t\r]/.test(text)?"'"+text:text;};
export function valueText(value) {
  if(value instanceof Date)return value.toISOString();
  if(value && typeof value==='object')return value.name || value.recordId || String(value._id || JSON.stringify(value));
  return String(value ?? '');
}
export async function spreadsheet(resource,items,format) {
  const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Sales');
  const fields=[{key:'recordId',label:'Record ID'},...resources[resource].fields,{key:'createdAt',label:'Created Date'}];
  sheet.columns=fields.map(field=>({header:field.label,key:field.key,width:25}));
  for(const item of items)sheet.addRow(Object.fromEntries(fields.map(field=>[field.key,safeText(valueText(item[field.key]))])));
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF403DF0'}};
  sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:{row:1,column:fields.length}};
  return format==='csv'?workbook.csv.writeBuffer():workbook.xlsx.writeBuffer();
}
function makePdf(draw) {
  return new Promise((resolve,reject)=>{const doc=new PDFDocument({size:'A4',margin:45});const buffers=[];doc.on('data',chunk=>buffers.push(chunk));doc.on('end',()=>resolve(Buffer.concat(buffers)));doc.on('error',reject);draw(doc);doc.end();});
}
export async function quotationPdf(item) {
  return makePdf(doc=>{
    doc.fillColor('#403DF0').fontSize(21).text('TRIMURYA | PROPOSAL & QUOTATION');
    doc.moveDown().fillColor('#0f172a').fontSize(11).text('Quotation: '+item.recordId);
    doc.text('Version: '+item.version+'   Status: '+item.status).moveDown();
    const lines=[['Client',valueText(item.company)],['Project',item.name],['Service',item.serviceCategory],['Unit',item.unit],['Quantity',item.quantity],['Unit Rate',item.currency+' '+item.unitRate],['Subtotal',item.currency+' '+item.subtotal],['Discount',item.discount],['Tax',item.tax+'%'],['Total',item.currency+' '+item.total],['Delivery Timeline',item.deliveryTimeline],['Payment Terms',item.paymentTerms],['Valid Until',item.validUntil ? new Date(item.validUntil).toISOString().slice(0,10):'']];
    for(const [label,value] of lines){if(doc.y>730)doc.addPage();doc.font('Helvetica-Bold').text(label+': ',{continued:true}).font('Helvetica').text(valueText(value) || '-');doc.moveDown(0.6);}
    if(item.notes)doc.moveDown().text('Notes: '+item.notes);
    doc.moveDown().fontSize(9).fillColor('#64748b').text('Generated from CRM commercial records. This PDF does not imply acceptance or a verified signature.');
  });
}
export async function tablePdf(title,fields,items) {
  return makePdf(doc=>{
    doc.fontSize(19).fillColor('#403DF0').text(title);doc.moveDown().fontSize(9).fillColor('#0f172a');
    for(const item of items){if(doc.y>640)doc.addPage();doc.font('Helvetica-Bold').text(valueText(item.name || item.recordId || item.employee || 'Record'));doc.font('Helvetica');for(const field of fields){const text=valueText(item[field.key]);if(text){if(doc.y>745)doc.addPage();doc.text(field.label+': '+text);}}doc.moveDown();}
    if(!items.length)doc.text('No matching records.');
  });
}
export async function parseImport(resource,file) {
  if(!file)fail('Select a CSV or XLSX file');
  const workbook=new ExcelJS.Workbook();
  if(file.originalname.toLowerCase().endsWith('.xlsx'))await workbook.xlsx.load(file.buffer);
  else if(file.originalname.toLowerCase().endsWith('.csv'))await workbook.csv.read(Readable.from(file.buffer));
  else fail('Import accepts CSV and XLSX files');
  const sheet=workbook.worksheets[0];if(!sheet)fail('The spreadsheet is empty');
  if(sheet.rowCount>1001)fail('Import at most 1000 records at a time');
  const lookup=new Map(resources[resource].fields.flatMap(field=>[[field.key.toLowerCase(),field],[field.label.toLowerCase(),field]]));
  const headers=[];sheet.getRow(1).eachCell((cell,column)=>{const text=valueText(cell.value).trim().toLowerCase();const field=lookup.get(text);if(field)headers[column]=field;});
  if(!headers.filter(Boolean).length)fail('No recognized headers. Use the exported template column names or field keys.');
  const rows=[];
  for(let row=2;row<=sheet.rowCount;row++){
    const data={};let used=false;
    headers.forEach((field,column)=>{
      if(!field)return;const raw=sheet.getRow(row).getCell(column).value;
      if(raw===null || raw===undefined || raw==='')return;
      if(raw && typeof raw==='object' && !(raw instanceof Date))fail('Formulas and rich spreadsheet objects are not accepted (row '+row+')');
      used=true;
      data[field.key]=field.type==='checkbox'?['true','yes','1'].includes(String(raw).toLowerCase()):['date','datetime-local'].includes(field.type)&&raw instanceof Date?raw.toISOString():field.type==='number'?Number(raw):String(raw);
    });
    if(used)rows.push({row,data});
  }
  return rows;
}
export async function reportSpreadsheet(fields,rows,format) {
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Report');
  sheet.columns=fields.map(field=>({key:field.key,header:field.label,width:28}));
  for(const row of rows)sheet.addRow(Object.fromEntries(fields.map(field=>[field.key,typeof row[field.key]==='number'?row[field.key]:safeText(valueText(row[field.key]))])));
  sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];
  return format==='csv'?book.csv.writeBuffer():book.xlsx.writeBuffer();
}