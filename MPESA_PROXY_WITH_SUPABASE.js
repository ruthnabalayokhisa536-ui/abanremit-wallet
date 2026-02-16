// M-Pesa Proxy Server with Supabase Integration
// Deploy this to Render.com

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// M-Pesa Credentials (from environment variables)
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'QwzCGC1fTPluVAXeNjxFTTDXsjklVKeL';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'your_consumer_secret';
const SHORT_CODE = process.env.MPESA_SHORT_CODE || '000772';
const PASSKEY = process.env.MPESA_PASSKEY || 'your_passkey';
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://mpesa-proxy-server-2.onrender.com/callback';

// Supabase Credentials
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found - wallet updates will not work');
}

// Get OAuth token
async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return response.data.access_token;
}

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'M-Pesa Proxy Server with Supabase',
    version: '3.0.0',
    supabaseConnected: !!supabase,
    endpoints: {
      stkpush: 'POST /stkpush',
      callback: 'POST /callback',
      health: 'GET /'
    }
  });
});

// STK Push endpoint
app.post('/stkpush', async (req, res) => {
  try {
    const { phone, amount, userId, accountReference, transactionDesc } = req.body;

    if (!phone || !amount || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phone, amount, userId'
      });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');

    // Get access token
    const accessToken = await getAccessToken();

    // STK Push request
    const stkResponse = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.floor(amount),
        PartyA: formattedPhone,
        PartyB: SHORT_CODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: accountReference || `DEPOSIT-${userId.slice(0, 8)}`,
        TransactionDesc: transactionDesc || 'Wallet Deposit'
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    console.log('✅ STK Push successful:', stkResponse.data);

    // Save to Supabase
    if (supabase) {
      const { error: dbError } = await supabase
        .from('mpesa_transactions')
        .insert({
          user_id: userId,
          merchant_request_id: stkResponse.data.MerchantRequestID,
          checkout_request_id: stkResponse.data.CheckoutRequestID,
          phone_number: formattedPhone,
          amount: amount,
          account_reference: accountReference || `DEPOSIT-${userId.slice(0, 8)}`,
          transaction_desc: transactionDesc || 'Wallet Deposit',
          status: 'pending'
        });

      if (dbError) {
        console.error('❌ Database error:', dbError);
      } else {
        console.log('✅ Transaction saved to database');
      }
    }

    res.json({
      success: true,
      message: 'STK Push sent successfully',
      checkoutRequestId: stkResponse.data.CheckoutRequestID,
      merchantRequestId: stkResponse.data.MerchantRequestID
    });

  } catch (error) {
    console.error('❌ STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errorMessage || error.message
    });
  }
});

// M-Pesa Callback endpoint
app.post('/callback', async (req, res) => {
  try {
    console.log('📥 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

    const { Body: { stkCallback } } = req.body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    // Extract metadata
    let amount = 0;
    let mpesaReceiptNumber = '';
    let transactionDate = '';
    let phoneNumber = '';

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount') amount = item.Value;
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
        if (item.Name === 'TransactionDate') transactionDate = item.Value;
        if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
      }
    }

    // Update Supabase
    if (supabase) {
      const { error: updateError } = await supabase
        .from('mpesa_transactions')
        .update({
          result_code: ResultCode,
          result_desc: ResultDesc,
          mpesa_receipt_number: mpesaReceiptNumber,
          transaction_date: transactionDate,
          status: ResultCode === 0 ? 'completed' : 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', CheckoutRequestID);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
      } else {
        console.log('✅ Transaction updated in database');
        console.log(`   Status: ${ResultCode === 0 ? 'completed' : 'failed'}`);
        console.log(`   Amount: KES ${amount}`);
        console.log(`   Receipt: ${mpesaReceiptNumber}`);
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('❌ Callback error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Failed' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 M-Pesa Proxy Server running on port ${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   - POST /stkpush - Initiate STK Push`);
  console.log(`   - POST /callback - M-Pesa callback`);
  console.log(`   - GET / - Health check`);
  console.log(`🔗 Supabase: ${supabase ? 'Connected ✅' : 'Not configured ⚠️'}`);
});
