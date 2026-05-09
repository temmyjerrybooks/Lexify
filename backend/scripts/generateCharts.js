/**
 * Auto-generates chart_data for questions that reference visual aids
 * (charts, graphs, tables, diagrams, maps, etc.) but have no chart_data yet.
 *
 * Run: node scripts/generateCharts.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Keywords that signal a visual aid is referenced in the question
const VISUAL_KEYWORDS = [
  'chart below', 'graph below', 'table below', 'diagram below',
  'figure below', 'map below', 'pie chart', 'bar chart', 'line graph',
  'bar graph', 'the chart shows', 'the graph shows', 'the table shows',
  'the diagram shows', 'as shown in', 'refer to the',
];

const needsChart = (text) =>
  VISUAL_KEYWORDS.some((kw) => text?.toLowerCase().includes(kw));

const CHART_SCHEMA = `
Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "type": "bar" | "line",
  "title": "string — short descriptive title",
  "y_label": "string — y-axis label with unit",
  "x_label": "string — x-axis label",
  "y_min": number,
  "y_max": number,
  "y_unit": "string — e.g. '%', 'kg', '$'",
  "x_axis": ["label1", "label2", ...],
  "series": [
    { "label": "string", "color": "#hexcode", "values": [number, number, ...] }
  ]
}

Rules:
- Use "bar" for comparisons across categories, "line" for trends over time
- x_axis must have 3–6 entries
- Each series must have exactly as many values as x_axis entries
- Use these colors in order: #6C47FF, #EF4444, #F59E0B, #14B8A6, #8B5CF6
- y_min should be 0 unless negative values are expected
- Make the data realistic and plausible for the topic described
`;

async function generateChartData(questionText) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You generate chart data JSON for exam questions that reference visual aids. ${CHART_SCHEMA}`,
      },
      {
        role: 'user',
        content: `Generate chart_data JSON for this exam question:\n\n"${questionText}"\n\nThe chart data should match what the question describes. Return only the JSON object.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  const raw = completion.choices[0].message.content.trim();
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

async function run() {
  console.log('Fetching questions without chart_data...');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, question_type, chart_data')
    .is('chart_data', null);

  if (error) {
    console.error('Failed to fetch questions:', error.message);
    process.exit(1);
  }

  const targets = questions.filter((q) => needsChart(q.question_text));
  console.log(`Found ${questions.length} questions without chart_data.`);
  console.log(`${targets.length} reference a visual aid and need chart generation.\n`);

  if (targets.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const q of targets) {
    const preview = q.question_text.substring(0, 80).replace(/\n/g, ' ');
    process.stdout.write(`Generating chart for: "${preview}..."  `);

    try {
      const chartData = await generateChartData(q.question_text);

      const { error: updateError } = await supabase
        .from('questions')
        .update({ chart_data: chartData })
        .eq('id', q.id);

      if (updateError) throw new Error(updateError.message);

      console.log(`✓ (${chartData.type}, ${chartData.series.length} series, ${chartData.x_axis.length} x-points)`);
      successCount++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failCount++;
    }

    // Small delay to avoid Groq rate limits
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\nDone. ${successCount} charts generated, ${failCount} failed.`);
}

run().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
