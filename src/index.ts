import 'dotenv/config';
import './task-manager';
import client from './client';

console.log(process.env.TOKEN!);
client.login(process.env.TOKEN!);
process.on('unhandledRejection', e => console.error(e));