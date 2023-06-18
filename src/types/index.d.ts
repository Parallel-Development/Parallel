import { InfractionType } from '@prisma/client';

export type AppealResponse = {
  question: string;
  response: string;
}[];

export type AutoModSpamTriggers = {
  amount: number;
  within: number;
}[];

export type Escalations = {
  amount: number;
  punishment: InfractionType;
  duration: `${number}`;
}[];

// declare module 'decancer' {
//   export default decancer = (name: string) => string;
// }
