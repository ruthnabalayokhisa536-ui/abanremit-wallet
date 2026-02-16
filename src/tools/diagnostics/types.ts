// Diagnostic Tool Type Definitions

export interface DiagnosticReport {
  timestamp: string;
  services: {
    auth: AuthDiagnostic;
    mpesa: MPesaDiagnostic;
    paystack: PaystackDiagnostic;
  };
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

export interface AuthDiagnostic {
  status: 'pass' | 'fail';
  checks: {
    urlConfigured: boolean;
    anonKeyValid: boolean;
    serviceKeyValid: boolean;
    userEndpointAccessible: boolean;
    rlsPoliciesCorrect: boolean;
  };
  errors: string[];
  recommendations: string[];
}

export interface MPesaDiagnostic {
  status: 'pass' | 'fail';
  checks: {
    dnsResolution: boolean;
    apiConnectivity: boolean;
    credentialsValid: boolean;
    oauthTokenObtained: boolean;
    callbackUrlAccessible: boolean;
  };
  errors: string[];
  recommendations: string[];
}

export interface PaystackDiagnostic {
  status: 'pass' | 'fail';
  checks: {
    apiConnectivity: boolean;
    publicKeyValid: boolean;
    secretKeyValid: boolean;
    webhookUrlAccessible: boolean;
    signatureValidation: boolean;
  };
  errors: string[];
  recommendations: string[];
}

export interface DiagnosticTool {
  runAll(): Promise<DiagnosticReport>;
  diagnoseAuth(): Promise<AuthDiagnostic>;
  diagnoseMPesa(): Promise<MPesaDiagnostic>;
  diagnosePaystack(): Promise<PaystackDiagnostic>;
  printReport(report: DiagnosticReport): void;
  exportReport(report: DiagnosticReport, format: 'json' | 'markdown'): string;
}
