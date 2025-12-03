import { NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = 'appscTrH12aw6CMQr';
const INTAKE_TABLE_ID = 'tblrvW64Kt0rXyWd2'; // Intake Inbox
const PERSONAL_TABLE_ID = 'tbl7KQgWwit30MmGX'; // Personal Check-Ins

export async function GET(request) {
  const airtableToken = process.env.AIRTABLE_API_KEY;

  if (!airtableToken) {
    return NextResponse.json(
      { error: 'Airtable not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const phone = searchParams.get('phone');

    // Build filter formula - get recent records, optionally filtered by phone
    let filterFormula = '';
    if (phone) {
      filterFormula = `&filterByFormula={from_number}="${phone}"`;
    }

    // Fetch from both tables in parallel
    const headers = {
      'Authorization': `Bearer ${airtableToken}`,
      'Content-Type': 'application/json',
    };

    const [intakeResponse, personalResponse] = await Promise.all([
      fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${INTAKE_TABLE_ID}?maxRecords=${limit}&sort[0][field]=Created&sort[0][direction]=desc${filterFormula}`,
        { headers, cache: 'no-store' }
      ),
      fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PERSONAL_TABLE_ID}?maxRecords=${limit}&sort[0][field]=Created&sort[0][direction]=desc`,
        { headers, cache: 'no-store' }
      ),
    ]);

    // Collect records from both tables
    let allRecords = [];

    if (intakeResponse.ok) {
      const intakeData = await intakeResponse.json();
      allRecords = allRecords.concat(
        intakeData.records.map(r => ({ ...r, _source: 'intake' }))
      );
    }

    if (personalResponse.ok) {
      const personalData = await personalResponse.json();
      allRecords = allRecords.concat(
        personalData.records.map(r => ({ ...r, _source: 'personal' }))
      );
    }

    if (allRecords.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch from Airtable' },
        { status: 500 }
      );
    }

    // Sort all records by Created date descending
    allRecords.sort((a, b) => {
      const dateA = new Date(a.fields.Created || a.createdTime);
      const dateB = new Date(b.fields.Created || b.createdTime);
      return dateB - dateA;
    });

    // Limit to requested number
    const data = { records: allRecords.slice(0, limit) };

    // Transform records for the frontend
    // Handle both Intake Inbox and Personal Check-Ins table field names
    const checkins = data.records.map(record => {
      const fields = record.fields;
      const isPersonal = record._source === 'personal';

      // Get state - Personal uses 'state', Intake uses 'pattern' or 'tags_raw'
      const detectedState = fields.state || fields.pattern || fields.tags_raw || null;

      // Get emotion from Summary (AI) object if available
      let emotion = null;
      if (fields['Summary (AI)']?.value) {
        const summaryMatch = fields['Summary (AI)'].value.match(/Detected emotion is '([^']+)'/i);
        if (summaryMatch) {
          emotion = summaryMatch[1];
        }
      }

      // Get feeling text - Personal uses 'feeling', Intake uses 'i_feel_text'
      const feelingText = fields.feeling || fields.i_feel_text;

      // Get summary - Personal uses 'essence', Intake uses 'summary'
      const summaryText = fields.essence || fields.summary;

      // Get intervention - Personal uses 'micro_invitation', Intake uses 'suggested_prompt'
      const interventionText = fields.micro_invitation || fields.suggested_prompt;

      return {
        id: record.id,
        timestamp: fields.timestamp || fields.Created,
        feeling: feelingText,
        source: isPersonal ? 'personal' : (fields.source || 'unknown'),
        detectedState: detectedState,
        emotion: emotion,
        emotionIntensity: fields.emotion_intensity,
        stateMode: fields.state_mode,
        statePhase: fields.state_phase,
        archetype: fields.archetype,
        direction: fields.direction,
        confidence: fields.detection_confidence,
        glyph: fields.glyph,
        summary: summaryText,
        intervention: interventionText,
        suggestedPrompt: interventionText,
        aiSummary: fields['Summary (AI)']?.value || null,
        aiIntervention: fields['Suggested Micro-Intervention (AI)']?.value || null,
        reasoning: fields.reasoning || null,
      };
    });

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error('Error fetching checkins:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
