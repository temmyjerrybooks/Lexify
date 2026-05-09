require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const { data: exams } = await supabase
    .from('exams')
    .select(`
      id, exam_type, title, is_free,
      exam_sections(id, skill, order_index, questions(id))
    `)
    .in('exam_type', ['TEF', 'TCF', 'IELTS'])
    .order('created_at', { ascending: true });

  for (const exam of exams) {
    const sectionCount = exam.exam_sections?.length || 0;
    const questionCount = exam.exam_sections?.reduce((s, sec) => s + (sec.questions?.length || 0), 0) || 0;
    const flag = sectionCount === 0 ? ' ← NO SECTIONS (BROKEN)' : questionCount === 0 ? ' ← NO QUESTIONS' : '';
    console.log(`[${exam.exam_type}] ${exam.is_free ? 'FREE' : 'paid'} | ${sectionCount} sections | ${questionCount} questions | ${exam.id.substring(0,8)} | ${exam.title.substring(0,50)}${flag}`);
  }
}

run().catch(console.error);
