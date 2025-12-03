import { NextResponse } from 'next/server';

export async function GET() {
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://n8n.museshift.com/webhook';

  try {
    // Fetch current state from public state reader
    const stateResponse = await fetch(`${webhookUrl}/public-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    let currentState = null;
    let smsActive = false;

    if (stateResponse.ok) {
      currentState = await stateResponse.json();
      smsActive = true; // If public-state works, n8n is responding
    }

    // Check SMS webhook health - use POST with empty body since n8n doesn't support HEAD
    let smsStatus = 'unknown';
    try {
      const smsCheck = await fetch(`${webhookUrl}/sms-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'Body=status_check&From=status_check',
        cache: 'no-store',
      });
      // If we get XML response (TwiML), the webhook is working
      smsStatus = smsCheck.ok ? 'active' : 'inactive';
    } catch {
      smsStatus = 'error';
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      n8n: {
        status: currentState ? 'connected' : 'disconnected',
        smsWorkflow: smsStatus,
      },
      currentState: currentState || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      ok: false,
      timestamp: new Date().toISOString(),
      n8n: {
        status: 'error',
        smsWorkflow: 'unknown',
      },
      currentState: null,
      error: error.message,
    });
  }
}
