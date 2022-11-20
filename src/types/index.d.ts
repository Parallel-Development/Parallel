export type DisputeResponse = {
  question: string;
  response: string;
}[]

declare module 'decancer' {
  export default decancer = (name: string) => string;
}