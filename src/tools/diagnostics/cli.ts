#!/usr/bin/env node

import { DiagnosticTool } from './DiagnosticTool';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const tool = new DiagnosticTool();

  console.log('\n🔍 Running Diagnostics...\n');

  try {
    switch (command) {
      case 'auth':
        const authResult = await tool.diagnoseAuth();
        tool.printReport({
          timestamp: new Date().toISOString(),
          services: {
            auth: authResult,
            mpesa: { status: 'fail', checks: {} as any, errors: [], recommendations: [] },
            paystack: { status: 'fail', checks: {} as any, errors: [], recommendations: [] }
          },
          overallStatus: authResult.status === 'pass' ? 'healthy' : 'critical'
        });
        break;

      case 'mpesa':
        const mpesaResult = await tool.diagnoseMPesa();
        tool.printReport({
          timestamp: new Date().toISOString(),
          services: {
            auth: { status: 'fail', checks: {} as any, errors: [], recommendations: [] },
            mpesa: mpesaResult,
            paystack: { status: 'fail', checks: {} as any, errors: [], recommendations: [] }
          },
          overallStatus: mpesaResult.status === 'pass' ? 'healthy' : 'degraded'
        });
        break;

      case 'paystack':
        const paystackResult = await tool.diagnosePaystack();
        tool.printReport({
          timestamp: new Date().toISOString(),
          services: {
            auth: { status: 'fail', checks: {} as any, errors: [], recommendations: [] },
            mpesa: { status: 'fail', checks: {} as any, errors: [], recommendations: [] },
            paystack: paystackResult
          },
          overallStatus: paystackResult.status === 'pass' ? 'healthy' : 'degraded'
        });
        break;

      case 'all':
      default:
        const report = await tool.runAll();
        tool.printReport(report);
        
        // Export to JSON if requested
        if (args.includes('--json')) {
          console.log('\n📄 JSON Export:\n');
          console.log(tool.exportReport(report, 'json'));
        }
        
        // Export to Markdown if requested
        if (args.includes('--markdown')) {
          console.log('\n📝 Markdown Export:\n');
          console.log(tool.exportReport(report, 'markdown'));
        }
        break;
    }

    console.log('\n✅ Diagnostic complete\n');
  } catch (error: any) {
    console.error('\n❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Show usage if no command
if (process.argv.length === 2) {
  console.log(`
Usage: npm run diagnose [command] [options]

Commands:
  all       Run all diagnostics (default)
  auth      Diagnose authentication issues
  mpesa     Diagnose M-Pesa gateway issues
  paystack  Diagnose Paystack gateway issues

Options:
  --json      Export results as JSON
  --markdown  Export results as Markdown

Examples:
  npm run diagnose
  npm run diagnose auth
  npm run diagnose all --json
  `);
  process.exit(0);
}

main();
