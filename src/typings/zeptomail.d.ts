// Minimal ambient declaration for the `zeptomail` package, which ships
// without TypeScript types. Only the surface we use is declared.
declare module "zeptomail" {
  export class SendMailClient {
    constructor(opts: { url: string; token: string });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMail(payload: Record<string, any>): Promise<any>;
  }
}
