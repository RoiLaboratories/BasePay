export interface USDCABI {
  encodeFunctionData: (functionName: string, args: any[]) => string;
}

export const USDC_ABI: USDCABI; 