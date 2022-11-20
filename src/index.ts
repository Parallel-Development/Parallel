import 'dotenv/config';
import './task-manager';
import client from './client';

client.login(process.env.TOKEN!);
process.on('unhandledRejection', e => console.error(e));