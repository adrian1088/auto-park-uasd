export type AppConfigType = {
  nodeEnv: string;
  name: string;
  description: string;
  port: number;
  apiPrefix: string;
  swaggerPath: string;
  frontendDomain: string;
  backendDomain: string;
  workingDirectory: string;
  defaultTokenActivationTtlHours: number;
  defaultTokenResetTtlMinutes: number;
};
