import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { models, SalesAudit } from './models.js';
import Notification from '../models/Notification.js';
import { Invoice } from '../models/Finance.js';
try {
  await connectDB();
  const hello=await mongoose.connection.db.admin().command({hello:1});
  if(!hello.setName && hello.msg!=='isdbgrid')throw new Error('Sales requires a MongoDB replica set or Atlas cluster for atomic workflows and audit writes.');
  for(const model of [...Object.values(models),SalesAudit,Invoice,Notification]){
    await model.createCollection();
    await model.createIndexes();
    console.log('Ready: '+model.collection.name);
  }
  await mongoose.connection.db.collection('sales_private_files.files').createIndex({filename:1,uploadDate:1});
  await mongoose.connection.db.collection('sales_private_files.chunks').createIndex({files_id:1,n:1},{unique:true});
  console.log('Sales collections and indexes ready. No production records or users were seeded.');
} catch(error){console.error(error.message);process.exitCode=1;} finally {await mongoose.disconnect();}