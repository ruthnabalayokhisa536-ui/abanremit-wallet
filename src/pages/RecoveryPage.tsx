import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { AuthRecoveryModule } from '@/tools/recovery/auth-recovery';
import { MPesaRecoveryModule } from '@/tools/recovery/mpesa-recovery';
import { PaystackRecoveryModule } from '@/tools/recovery/paystack-recovery';
import type { RecoveryResult } from '@/tools/recovery';

export default function RecoveryPage() {
  const [authResult, setAuthResult] = useState<RecoveryResult | null>(null);
  const [mpesaResult, setMPesaResult] = useState<RecoveryResult | null>(null);
  const [paystackResult, setPaystackResult] = useState<RecoveryResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const authRecovery = new AuthRecoveryModule();
  const mpesaRecovery = new MPesaRecoveryModule();
  const paystackRecovery = new PaystackRecoveryModule();

  const runAuthRecovery = async () => {
    setLoading('auth');
    try {
      const result = await authRecovery.verifyRecovery();
      setAuthResult(result);
    } catch (error: any) {
      setAuthResult({
        success: false,
        message: error.message,
        steps: [],
        errors: [error.message]
      });
    } finally {
      setLoading(null);
    }
  };

  const runMPesaRecovery = async () => {
    setLoading('mpesa');
    try {
      const result = await mpesaRecovery.verifyRecovery();
      setMPesaResult(result);
    } catch (error: any) {
      setMPesaResult({
        success: false,
        message: error.message,
        steps: [],
        errors: [error.message]
      });
    } finally {
      setLoading(null);
    }
  };

  const runPaystackRecovery = async () => {
    setLoading('paystack');
    try {
      const result = await paystackRecovery.verifyRecovery();
      setPaystackResult(result);
    } catch (error: any) {
      setPaystackResult({
        success: false,
        message: error.message,
        steps: [],
        errors: [error.message]
      });
    } finally {
      setLoading(null);
    }
  };

  const renderResult = (result: RecoveryResult | null, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (!result) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Click "Verify Recovery" to check the service status
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>

        {result.steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recovery Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.steps.map((step, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    {step.startsWith('✓') ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : step.startsWith('✗') ? (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : step.startsWith('⚠️') ? (
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    ) : null}
                    <span>{step.replace(/^[✓✗⚠️]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.errors && result.errors.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-sm text-red-600">Errors Found</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {result.errors.map((error, i) => (
                  <li key={i} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Service Recovery</h1>
        <p className="text-gray-600">
          Verify and recover authentication and payment gateway services
        </p>
      </div>

      <Tabs defaultValue="auth" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
          <TabsTrigger value="paystack">Paystack</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Recovery</CardTitle>
              <CardDescription>
                Verify Supabase authentication and fix 403 errors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runAuthRecovery}
                disabled={loading === 'auth'}
                className="w-full"
              >
                {loading === 'auth' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verify Recovery
                  </>
                )}
              </Button>

              {renderResult(authResult, loading === 'auth')}

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">Recovery Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap">
                    {authRecovery.generateRecoveryGuide()}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mpesa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>M-Pesa Recovery</CardTitle>
              <CardDescription>
                Fix DNS timeouts and restore M-Pesa connectivity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runMPesaRecovery}
                disabled={loading === 'mpesa'}
                className="w-full"
              >
                {loading === 'mpesa' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verify Recovery
                  </>
                )}
              </Button>

              {renderResult(mpesaResult, loading === 'mpesa')}

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">Recovery Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap">
                    {mpesaRecovery.generateRecoveryGuide()}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paystack" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paystack Recovery</CardTitle>
              <CardDescription>
                Verify API keys and restore Paystack payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runPaystackRecovery}
                disabled={loading === 'paystack'}
                className="w-full"
              >
                {loading === 'paystack' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verify Recovery
                  </>
                )}
              </Button>

              {renderResult(paystackResult, loading === 'paystack')}

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">Recovery Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap">
                    {paystackRecovery.generateRecoveryGuide()}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
