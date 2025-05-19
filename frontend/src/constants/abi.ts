interface USDCABI {
  encodeFunctionData: (functionName: string, args: any[]) => string;
}

export const USDC_ABI: USDCABI = {
  encodeFunctionData: (functionName: string, args: any[]) => {
    switch (functionName) {
      case 'transfer':
        return `0xa9059cbb${args[0].slice(2).padStart(64, '0')}${args[1].toString(16).padStart(64, '0')}`;
      case 'balanceOf':
        return `0x70a08231000000000000000000000000${args[0].slice(2)}`;
      default:
        throw new Error(`Function ${functionName} not supported`);
    }
  }
}; 