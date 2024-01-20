import 'dotenv/config';
import './routines';
import client from './client';

client.login(process.env.TOKEN!);
process.on('unhandledRejection', e => console.error(e));
