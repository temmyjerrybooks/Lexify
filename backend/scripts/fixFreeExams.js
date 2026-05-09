require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // 1. Find broken exams (0 sections)
  const { data: allExams } = await supabase
    .from('exams')
    .select('id, exam_type, title, is_free, exam_sections(id)');

  const broken = allExams.filter(e => e.exam_sections.length === 0);
  console.log(`Found ${broken.length} broken exam(s) with no sections.`);

  for (const exam of broken) {
    console.log(`  Cleaning [${exam.exam_type}] ${exam.id.substring(0, 8)}...`);
    // Delete sessions referencing this exam first
    await supabase.from('exam_sessions').delete().eq('exam_id', exam.id);
    // Now delete the exam
    const { error } = await supabase.from('exams').delete().eq('id', exam.id);
    if (error) console.log(`    ✗ ${error.message}`);
    else console.log(`    ✅ Deleted`);
  }

  // 2. Reset all is_free flags — give each type exactly 1 good free exam
  const types = ['IELTS', 'TEF', 'TCF', 'DALF'];
  for (const type of types) {
    // Get all exams of this type with section count
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, is_free, exam_sections(id, questions(id))')
      .eq('exam_type', type)
      .order('created_at', { ascending: true });

    const good = (exams || []).filter(e => e.exam_sections.length >= 3);

    if (good.length === 0) {
      console.log(`  ⚠️  [${type}] no exam with 3+ sections found`);
      continue;
    }

    // Reset ALL to paid first
    await supabase.from('exams').update({ is_free: false }).eq('exam_type', type);

    // Promote the best one (most questions) as the free exam
    const best = good.reduce((a, b) => {
      const aq = a.exam_sections.reduce((s, sec) => s + sec.questions.length, 0);
      const bq = b.exam_sections.reduce((s, sec) => s + sec.questions.length, 0);
      return bq > aq ? b : a;
    });

    await supabase.from('exams').update({ is_free: true }).eq('id', best.id);
    const qCount = best.exam_sections.reduce((s, sec) => s + sec.questions.length, 0);
    console.log(`  ✅ [${type}] free exam → ${best.id.substring(0, 8)} (${best.exam_sections.length} sections, ${qCount}q): ${best.title.substring(0, 45)}`);
  }

  console.log('\nDone.');
}

run().catch(console.error);
