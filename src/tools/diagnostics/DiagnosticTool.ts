import type { 
  DiagnosticReport, 
  AuthDiagnostic, 
  MPesaDiagnostic, 
  PaystackDiagnostic,
  DiagnosticTool as IDiagnosticTool
} from './types';
import { AuthDiagnosticModule } from './auth-diagnostic';
import { MPesaDiagnosticModule } from './mpesa-diagnostic';
import { PaystackDiagnosticModule } from './paystack-diagnostic';

export class DiagnosticTool implements IDiagnosticTool {
  private authDiagnostic = new AuthDiagnosticModule();
  private mpesaDiagnostic = new MPesaDiagnosticModule();
  private paystackDiagnostic = new PaystackDiagnosticModule();
  async runAll(): Promise<DiagnosticReport> {
    const timestamp = new Date().toISOString();
    
    const [auth, mpesa, paystack] = await Promise.all([
      this.diagnoseAuth(),
      this.diagnoseMPesa(),
      this.diagnosePaystack()
    ]);

    const overallStatus = this.calculateOverallStatus(auth, mpesa, paystack);

    return {
      timestamp,
      services: { auth, mpesa, paystack },
      overallStatus
    };
  }

  async diagnoseAuth(): Promise<AuthDiagnostic> {
    return await this.authDiagnostic.diagnose();
  }

  async diagnoseMPesa(): Promise<MPesaDiagnostic> {
    return await this.mpesaDiagnostic.diagnose();
  }

  async diagnosePaystack(): Promise<PaystackDiagnostic> {
    return await this.paystackDiagnostic.diagnose();
  }

  printReport(report: DiagnosticReport): void {
    console.log('\n=== DIAGNOSTIC REPORT ===');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Overall Status: ${report.overallStatus.toUpperCase()}\n`);

    this.printServiceDiagnostic('Authentication', report.services.auth);
    this.printServiceDiagnostic('M-Pesa', report.services.mpesa);
    this.printServiceDiagnostic('Paystack', report.services.paystack);
  }

  exportReport(report: DiagnosticReport, format: 'json' | 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    // Markdown format
    let md = `# Diagnostic Report\n\n`;
    md += `**Timestamp:** ${report.timestamp}\n`;
    md += `**Overall Status:** ${report.overallStatus.toUpperCase()}\n\n`;

    md += `## Authentication Service\n`;
    md += this.formatServiceMarkdown(report.services.auth);

    md += `\n## M-Pesa Gateway\n`;
    md += this.formatServiceMarkdown(report.services.mpesa);

    md += `\n## Paystack Gateway\n`;
    md += this.formatServiceMarkdown(report.services.paystack);

    return md;
  }

  private calculateOverallStatus(
    auth: AuthDiagnostic,
    mpesa: MPesaDiagnostic,
    paystack: PaystackDiagnostic
  ): 'healthy' | 'degraded' | 'critical' {
    const failedServices = [auth, mpesa, paystack].filter(s => s.status === 'fail').length;

    if (failedServices === 0) return 'healthy';
    if (failedServices === 3 || auth.status === 'fail') return 'critical';
    return 'degraded';
  }

  private printServiceDiagnostic(name: string, diagnostic: any): void {
    console.log(`--- ${name} ---`);
    console.log(`Status: ${diagnostic.status.toUpperCase()}`);
    
    console.log('Checks:');
    Object.entries(diagnostic.checks).forEach(([key, value]) => {
      const icon = value ? '✓' : '✗';
      console.log(`  ${icon} ${key}: ${value}`);
    });

    if (diagnostic.errors.length > 0) {
      console.log('Errors:');
      diagnostic.errors.forEach((err: string) => console.log(`  - ${err}`));
    }

    if (diagnostic.recommendations.length > 0) {
      console.log('Recommendations:');
      diagnostic.recommendations.forEach((rec: string) => console.log(`  - ${rec}`));
    }

    console.log('');
  }

  private formatServiceMarkdown(diagnostic: any): string {
    let md = `**Status:** ${diagnostic.status.toUpperCase()}\n\n`;
    
    md += `### Checks\n`;
    Object.entries(diagnostic.checks).forEach(([key, value]) => {
      const icon = value ? '✓' : '✗';
      md += `- ${icon} ${key}: ${value}\n`;
    });

    if (diagnostic.errors.length > 0) {
      md += `\n### Errors\n`;
      diagnostic.errors.forEach((err: string) => md += `- ${err}\n`);
    }

    if (diagnostic.recommendations.length > 0) {
      md += `\n### Recommendations\n`;
      diagnostic.recommendations.forEach((rec: string) => md += `- ${rec}\n`);
    }

    return md;
  }
}
