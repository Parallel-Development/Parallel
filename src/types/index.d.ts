export type DisputeResponse = {
  question: string;
  response: string;
}[];

export type AutoModSpamTriggers = {
  amount: number;
  within: number;
}[];

declare module 'decancer' {
  export default decancer = (name: string) => string;
}
