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
export function exportFields(resource) {
  return [{key:'recordId',label:'Record ID'},...resources[resource].fields,...(resource==='linkedin'?[{key:'createdBy',label:'Added By'}]:[]),{key:'createdAt',label:'Created Date'}];
}
export async function spreadsheet(resource,items,format) {
  const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Sales');
  const fields=exportFields(resource);
  sheet.columns=fields.map(field=>({header:field.label,key:field.key,width:25}));
  for(const item of items)sheet.addRow(Object.fromEntries(fields.map(field=>[field.key,safeText(valueText(item[field.key]))])));
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF403DF0'}};
  sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:{row:1,column:fields.length}};
  return format==='csv'?workbook.csv.writeBuffer():workbook.xlsx.writeBuffer();
}
export async function importTemplate(resource) {
  const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('LinkedIn Outreach');
  const fields=[
    {key:'name',label:'Name'},
    {key:'linkedinUrl',label:'LinkedIn Profile Link'},
    {key:'emails',label:'Email ID(s)'},
    {key:'clientCategory',label:'Category'},
  ];
  sheet.columns=fields.map(field=>({header:field.label,key:field.key,width:25}));
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
  sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF403DF0'}};
  sheet.views=[{state:'frozen',ySplit:1}];
  sheet.autoFilter={from:'A1',to:{row:1,column:fields.length}};
  return workbook.xlsx.writeBuffer();
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
  if(!workbook.worksheets.length)fail('The spreadsheet is empty');
  const normalizeHeader=value=>String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g,'');
  const lookup=new Map(resources[resource].fields.flatMap(field=>[[normalizeHeader(field.key),field],[normalizeHeader(field.label),field]]));
  if(resource==='linkedin'){
    const aliases={
      name:['contact','contactperson','prospect','prospectname','fullname','personname'],
      linkedinUrl:['link','url','linkedin','linkedinprofile','profile','profileurl','linkedinprofileurl','linkedinprofilelink','linkedinaccount'],
      emails:['email','emailaddress','emailid','emailids','e-mail','e-mailaddress'],
      mobileNumbers:['mobile','mobilenumber','mobileno','phone','phonenumber','telephone','contactnumber','whatsapp'],
      clientCategory:['category','categories','clienttype','industry','servicecategory'],
      connectionStatus:['connection','connectionstate'],
      replyStatus:['reply','response','responsestatus'],
      assignedTo:['owner','assignedto','assignedowner','salesowner','assignedbda','bda','salesrepresentative'],
      notes:['note','remarks','comments','description'],
    };
    for(const [key,values] of Object.entries(aliases)){
      const field=resources.linkedin.fields.find(item=>item.key===key);
      for(const value of values)lookup.set(normalizeHeader(value),field);
    }
  }
  const cellText=value=>{
    if(typeof value==='string')return value.trim();
    if(value && typeof value==='object'){
      if(Array.isArray(value.richText))return value.richText.map(part=>typeof part?.text==='string'?part.text:'').join('').trim();
      if(typeof value.text==='string')return value.text.trim();
      if(typeof value.hyperlink==='string')return value.hyperlink.trim();
    }
    return valueText(value).trim();
  };
  const simpleRichText=value=>Boolean(value&&typeof value==='object'&&Array.isArray(value.richText)
    && Object.keys(value).every(key=>key==='richText')
    && value.richText.every(part=>part&&typeof part.text==='string'
      && Object.keys(part).every(key=>['text','font'].includes(key))
      && (part.font===undefined||(part.font&&typeof part.font==='object'&&!Array.isArray(part.font)))));
  const rows=[];
  let recognizedHeaders=false;
  for(const sheet of workbook.worksheets){
    let headerRow=0,headers=[];
    for(let row=1;row<=Math.min(sheet.rowCount,20);row++){
      const candidate=[];
      sheet.getRow(row).eachCell((cell,column)=>{
        const field=lookup.get(normalizeHeader(cellText(cell.value)));
        if(field)candidate[column]=field;
      });
      if(candidate.filter(Boolean).length>headers.filter(Boolean).length){headerRow=row;headers=candidate;}
    }
    if(!headerRow)continue;
    recognizedHeaders=true;
    for(let row=headerRow+1;row<=sheet.rowCount;row++){
      const data={};let used=false;
      headers.forEach((field,column)=>{
        if(!field)return;
        const raw=sheet.getRow(row).getCell(column).value;
        if(raw===null || raw===undefined || raw==='')return;
        let value=raw;
        if(raw && typeof raw==='object' && !(raw instanceof Date)) {
          if(Array.isArray(raw.richText)){
            if(!simpleRichText(raw))fail('Formatted spreadsheet text is not supported ('+sheet.name+', row '+row+')');
            value=raw.richText.map(part=>part.text).join('');
          }else{
            const keys=Object.keys(raw);
            const hyperlinkOnly=keys.every(key=>['text','hyperlink','tooltip'].includes(key))
              && typeof raw.hyperlink==='string'
              && (raw.text===undefined || typeof raw.text==='string' || simpleRichText(raw.text))
              && (raw.tooltip===undefined || typeof raw.tooltip==='string');
            if(!hyperlinkOnly || !['url','email-list','phone-list','text','textarea','select','reference'].includes(field.type))fail('Formulas and rich spreadsheet objects are not accepted ('+sheet.name+', row '+row+')');
            value=field.type==='url'?raw.hyperlink:cellText(raw.text) || (field.type==='email-list'?raw.hyperlink.replace(/^mailto:/i,''):field.type==='phone-list'?raw.hyperlink.replace(/^tel:/i,''):raw.hyperlink);
          }
        }
        used=true;
        if(['email-list','phone-list'].includes(field.type)){
          const text=String(value).trim();
          if(text.startsWith('[')){
            try{data[field.key]=JSON.parse(text);}catch{fail(field.label+' must contain a valid list ('+sheet.name+', row '+row+')');}
            if(!Array.isArray(data[field.key])||data[field.key].some(value=>typeof value!=='string'))fail(field.label+' must contain a list of text values ('+sheet.name+', row '+row+')');
          }else {
            const values=text.split(/[,\n;]+/).map(value=>value.trim()).filter(Boolean);
            data[field.key]=[...(data[field.key] || []),...values];
          }
        }else if(field.type==='checkbox')data[field.key]=['true','yes','1'].includes(String(value).toLowerCase());
        else if(['date','datetime-local'].includes(field.type)&&value instanceof Date)data[field.key]=value.toISOString();
        else if(field.type==='number')data[field.key]=Number(value);
        else data[field.key]=String(value);
      });
      if(used)rows.push({row,sheet:sheet.name,data});
    }
  }
  if(!recognizedHeaders)fail('No recognized headers. Use LinkedIn/contact, profile URL, email, phone, owner, or the template column names.');
  return rows;
}
export async function reportSpreadsheet(fields,rows,format) {
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Report');
  sheet.columns=fields.map(field=>({key:field.key,header:field.label,width:28}));
  for(const row of rows)sheet.addRow(Object.fromEntries(fields.map(field=>[field.key,typeof row[field.key]==='number'?row[field.key]:safeText(valueText(row[field.key]))])));
  sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];
  return format==='csv'?book.csv.writeBuffer():book.xlsx.writeBuffer();
}