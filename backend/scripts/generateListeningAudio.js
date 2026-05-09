/**
 * generateListeningAudio.js
 *
 * For each LISTENING section with no audio_url:
 *  1. Fetch its questions
 *  2. Use Groq (llama-3.3-70b) to write a realistic IELTS listening script
 *     where all answers appear naturally in the dialogue/lecture
 *  3. Convert script → MP3 via Microsoft Edge TTS (en-GB-RyanNeural — free, no API key)
 *  4. Upload MP3 to Supabase Storage (exam-audio bucket)
 *  5. Update exam_sections.audio_url + store script in passage_text as fallback
 *
 * Usage:
 *   node scripts/generateListeningAudio.js              (all sections)
 *   node scripts/generateListeningAudio.js --limit=5    (first 5 only)
 *   node scripts/generateListeningAudio.js --dry-run    (generate scripts, skip TTS+upload)
 *   node scripts/generateListeningAudio.js --section=<uuid>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Groq = require('groq-sdk');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { createClient } = require('@supabase/supabase-js');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const args    = Object.fromEntries(process.argv.slice(2).map(a => a.replace('--','').split('=')));
const DRY_RUN = 'dry-run' in args;
const LIMIT   = args.limit ? parseInt(args.limit) : Infinity;
const SINGLE  = args.section || null;

// Groq key rotation — reuse the same pool from the question bank generator
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
].filter(Boolean);
let keyIdx = 0;
const getGroq = () => new Groq({ apiKey: GROQ_KEYS[keyIdx % GROQ_KEYS.length] });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Script generation ────────────────────────────────────────────────────────

async function generateScript(section, questions) {
  const isConversation = /conversation|dialogue|enquiry|discussion|interview|call|meeting/i.test(section.title || '');

  const questionLines = questions.map((q, i) => {
    const opts = q.options?.length
      ? '  Options: ' + q.options.map(o => `${o.label}) ${o.text}`).join(' | ')
      : '';
    return `Q${i + 1} [${q.question_type}]: ${q.question_text}${opts ? '\n  ' + opts : ''}\n  Answer: ${q.correct_answer}`;
  }).join('\n\n');

  const format = isConversation
    ? 'a natural conversation between two people. Use "[Person A]:" and "[Person B]:" labels.'
    : 'a monologue: a lecture, talk, or radio programme. Use a single narrator voice.';

  const prompt = `You are an expert IELTS Listening exam script writer.

Write ${format} for a section titled: "${section.title || 'IELTS Listening'}"

The recording MUST naturally include information that answers ALL questions below. Listeners must be able to answer the questions from what they hear — the answers should feel like natural parts of the conversation/lecture, not artificially highlighted.

Questions to cover:
${questionLines}

Rules:
- British English, natural spoken register (not written)
- Length: enough to answer ${questions.length} questions naturally (aim for ${Math.max(3, questions.length) * 45}–${Math.max(3, questions.length) * 70} words)
- Do NOT number the questions or answers — weave them into the dialogue/lecture organically
- No stage directions or parenthetical notes
- Start speaking immediately with no preamble

Output only the spoken script.`;

  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    try {
      const client = getGroq();
      const res = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0].message.content.trim();
    } catch (err) {
      if (err.status === 429) {
        keyIdx++;
        await sleep(1500);
      } else {
        throw err;
      }
    }
  }
  throw new Error('All Groq keys rate-limited');
}

// ── TTS via Microsoft Edge ───────────────────────────────────────────────────

async function textToSpeech(script) {
  // Strip speaker labels so TTS reads smoothly
  const clean = script
    .replace(/\[(Person [AB]|Speaker \d+|Narrator)\]:\s*/g, '\n')
    .replace(/(Person [AB]|Speaker \d+):\s*/g, '\n')
    .trim();

  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-GB-RyanNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = await tts.toStream(clean);

  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

// ── Supabase upload ──────────────────────────────────────────────────────────

async function uploadAudio(buffer, sectionId) {
  const path = `listening/ielts/${sectionId}.mp3`;

  const { error } = await supabase.storage
    .from('exam-audio')
    .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('exam-audio')
    .getPublicUrl(path);

  return publicUrl;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nMode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}, Limit: ${LIMIT === Infinity ? 'all' : LIMIT}\n`);

  let query = supabase
    .from('exam_sections')
    .select('id, exam_id, skill, title, audio_url, exams!inner(exam_type)')
    .eq('skill', 'LISTENING')
    .or('audio_url.is.null,audio_url.like.%your-supabase-project%');

  if (SINGLE) query = supabase.from('exam_sections').select('id, exam_id, skill, title, audio_url, exams!inner(exam_type)').eq('id', SINGLE);

  const { data: sections, error: sErr } = await query.limit(LIMIT === Infinity ? 200 : LIMIT);
  if (sErr) { console.error('Fetch error:', sErr.message); process.exit(1); }

  console.log(`${sections.length} section(s) to process\n`);
  let ok = 0, skipped = 0, failed = 0;

  for (const [idx, section] of sections.entries()) {
    const tag = `[${idx + 1}/${sections.length}]`;
    console.log(`${tag} ${section.title || section.id}`);

    // Fetch questions for this section
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, question_text, question_type, options, correct_answer')
      .eq('section_id', section.id)
      .in('question_type', ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'TRUE_FALSE_NOT_GIVEN'])
      .order('order_index', { ascending: true })
      .limit(15);

    if (qErr || !questions?.length) {
      console.log('  ⚠ No questions — skipping\n');
      skipped++;
      continue;
    }

    try {
      // 1. Generate script
      process.stdout.write(`  Generating script (${questions.length}q)... `);
      const script = await generateScript(section, questions);
      const wordCount = script.split(/\s+/).length;
      console.log(`${wordCount} words`);

      if (DRY_RUN) {
        console.log('  Preview: ' + script.substring(0, 200).replace(/\n/g, ' ') + '…\n');
        ok++;
        continue;
      }

      // 2. TTS
      process.stdout.write('  TTS (Edge)... ');
      const audioBuffer = await textToSpeech(script);
      console.log(`${(audioBuffer.length / 1024).toFixed(0)} KB`);

      // 3. Upload
      process.stdout.write('  Uploading... ');
      const publicUrl = await uploadAudio(audioBuffer, section.id);
      console.log('done');

      // 4. Update DB: audio_url + store script in passage_text as text fallback
      const { error: uErr } = await supabase
        .from('exam_sections')
        .update({ audio_url: publicUrl, passage_text: script })
        .eq('id', section.id);

      if (uErr) throw new Error(`DB update: ${uErr.message}`);

      console.log(`  ✅ ${publicUrl.replace(process.env.SUPABASE_URL, '[supabase]')}\n`);
      ok++;

      await sleep(800);
    } catch (err) {
      console.error(`  ✗ ${err.message}\n`);
      failed++;
      await sleep(2000);
    }
  }

  console.log(`\nFinished: ✅ ${ok} done, ⚠ ${skipped} skipped, ✗ ${failed} failed`);
}

run().catch(console.error);
