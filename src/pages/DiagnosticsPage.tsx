import { useState } from 'react';
import { DiagnosticTool } from '@/tools/diagnostics';
import type { DiagnosticReport } from '@/tools/diagnostics/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function DiagnosticsPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const tool = new DiagnosticTool();
      const result = await tool.runAll();
      setReport(result);
    } catch (err: any) {
      setError(err.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail') => {
    return status === 'pass' ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
        <p className="text-gray-600">
          Check the health of authentication and payment gateway services
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Diagnostics'
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <div className="space-y-6">
          {/* Overall Status */}
          <Card className={`border-2 ${getOverallStatusColor(report.overallStatus)}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Overall Status: {report.overallStatus.toUpperCase()}
              </CardTitle>
              <CardDescription>
                Last checked: {new Date(report.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Authentication Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(report.services.auth.status)}
                Authentication Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Checks:</h4>
                  <ul className="space-y-1">
                    {Object.entries(report.services.auth.checks).map(([key, value]) => (
                      <li key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>{key}: {value ? 'Pass' : 'Fail'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {report.services.auth.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.services.auth.errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.services.auth.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-600">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.services.auth.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* M-Pesa Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(report.services.mpesa.status)}
                M-Pesa Gateway
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Checks:</h4>
                  <ul className="space-y-1">
                    {Object.entries(report.services.mpesa.checks).map(([key, value]) => (
                      <li key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>{key}: {value ? 'Pass' : 'Fail'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {report.services.mpesa.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.services.mpesa.errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.services.mpesa.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-600">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.services.mpesa.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Paystack Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(report.services.paystack.status)}
                Paystack Gateway
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Checks:</h4>
                  <ul className="space-y-1">
                    {Object.entries(report.services.paystack.checks).map(([key, value]) => (
                      <li key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>{key}: {value ? 'Pass' : 'Fail'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {report.services.paystack.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.services.paystack.errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.services.paystack.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-600">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.services.paystack.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
