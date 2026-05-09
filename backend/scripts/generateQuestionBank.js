/**
 * Examify Question Bank Generator
 * Uses Google Gemini Flash (free tier) — no Groq tokens consumed.
 *
 * Run:  node scripts/generateQuestionBank.js
 * Args: --exams=35 --type=IELTS    (defaults: 35 exams, all types)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Build a pool from all configured keys
const groqKeys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
].filter(Boolean);

const groqClients = groqKeys.map(k => new Groq({ apiKey: k }));
const cooldownUntil = new Array(groqKeys.length).fill(0);
let rrIndex = 0;

const getGroqClient = () => {
  const now = Date.now();
  for (let i = 0; i < groqClients.length; i++) {
    const idx = (rrIndex + i) % groqClients.length;
    if (cooldownUntil[idx] <= now) {
      rrIndex = (idx + 1) % groqClients.length;
      return { client: groqClients[idx], keyIndex: idx };
    }
  }
  // All cooling — use the one that recovers soonest
  let minIdx = cooldownUntil.indexOf(Math.min(...cooldownUntil));
  return { client: groqClients[minIdx], keyIndex: minIdx };
};

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => { const [k, v] = a.replace('--', '').split('='); return [k, v]; })
);
const TARGET_EXAMS = parseInt(args.exams || 35);
const TARGET_TYPE  = args.type?.toUpperCase() || null;

// ─── Expanded topics pool (100+ unique topics to avoid repetition) ────────────
const TOPICS = {
  IELTS: [
    // Environment & Nature
    'Urban green spaces and mental health',
    'Ocean plastic pollution and marine ecosystems',
    'Rewilding and biodiversity conservation',
    'The impact of deforestation on climate',
    'Coral reef decline and ocean acidification',
    'Urban heat islands and city planning',
    'Water scarcity and sustainable agriculture',
    'Wildfire management in a changing climate',
    // Technology & Society
    'Artificial intelligence in education',
    'The future of remote work',
    'Digital privacy in the modern world',
    'The gig economy and worker rights',
    'Autonomous vehicles and road safety',
    'The rise of cryptocurrency and blockchain',
    'Social media algorithms and public opinion',
    'The impact of automation on employment',
    'Wearable technology and personal health monitoring',
    'The ethics of gene editing and CRISPR',
    'Cybersecurity threats in critical infrastructure',
    'Virtual reality in healthcare and therapy',
    // Economy & Society
    'The economics of fair trade',
    'Ageing populations in developed countries',
    'Urbanisation trends in developing nations',
    'Income inequality and social mobility',
    'The gig economy and worker rights',
    'Migration and economic development',
    'Universal basic income — prospects and challenges',
    'The sharing economy and consumer behaviour',
    'Corporate social responsibility and sustainability',
    // Health & Wellbeing
    'The rise of plant-based diets',
    'Mental health awareness in the workplace',
    'Childhood obesity and government intervention',
    'The global antibiotic resistance crisis',
    'Telemedicine and the future of healthcare',
    'Sleep science and its effect on productivity',
    'The psychology of social isolation',
    // Culture & Education
    'Cultural heritage preservation in the digital age',
    'The decline of traditional media',
    'Gender equality in STEM fields',
    'The effectiveness of standardised testing',
    'Multilingualism and cognitive benefits',
    'Space tourism and its implications',
    'The future of space exploration',
    'Museum accessibility and digital collections',
    // Infrastructure & Urban
    'Smart cities and IoT integration',
    'The future of public transportation',
    'Renewable energy transitions',
    'Nuclear power in the clean energy mix',
    'Green architecture and sustainable building design',
    'The economics of recycling and circular economy',
  ],

  TEF: [
    // Société française
    "L'immigration et l'intégration culturelle",
    "La place des femmes dans la société française",
    "Le système éducatif français et ses réformes",
    "La laïcité et la religion dans l'espace public",
    "Le chômage des jeunes en France",
    "Les inégalités sociales et économiques en France",
    "La politique familiale et la natalité",
    "Le mouvement des Gilets Jaunes et ses conséquences",
    "La fracture numérique entre générations",
    "Les banlieues françaises et l'exclusion sociale",
    // Environnement & Économie
    "Le changement climatique et les politiques françaises",
    "Le tourisme durable et l'écotourisme",
    "L'économie numérique et les start-ups",
    "Le logement en milieu urbain",
    "Les énergies renouvelables en France",
    "La mondialisation et ses effets sur l'emploi",
    "L'agriculture biologique et les circuits courts",
    "La transition écologique et les entreprises",
    "Le télétravail et la transformation du monde du travail",
    "L'économie collaborative et les plateformes numériques",
    // Santé & Culture
    "La santé publique et la médecine préventive",
    "Le système de santé français face aux défis modernes",
    "La culture française face à la globalisation",
    "Le patrimoine architectural français",
    "Les médias et la désinformation",
    "L'accès à la culture dans les zones rurales",
    "Le sport et l'identité nationale",
    "La gastronomie française et son évolution",
    "La littérature francophone contemporaine",
    "Le cinéma français et son influence mondiale",
    // International
    "La France et l'Union Européenne",
    "La Francophonie et ses enjeux",
    "L'aide au développement et la coopération internationale",
    "Les relations franco-africaines",
    "La politique étrangère de la France",
  ],

  TCF: [
    // Vie quotidienne
    "Les transports en commun et la mobilité urbaine",
    "L'alimentation saine et les habitudes alimentaires",
    "Le bénévolat associatif et l'engagement citoyen",
    "Les loisirs et les activités culturelles en France",
    "La vie en appartement versus la vie en maison",
    "Les achats en ligne et la consommation numérique",
    "Les relations intergénérationnelles",
    "La gestion du temps libre et le bien-être",
    "Les vacances et le tourisme intérieur",
    "Le sport amateur et sa pratique en France",
    // Travail & Études
    "L'entrepreneuriat des jeunes en France",
    "Le marché du travail contemporain",
    "Les études supérieures et l'orientation professionnelle",
    "Le stage professionnel et l'insertion dans le marché",
    "L'apprentissage des langues étrangères",
    "La formation continue et la reconversion professionnelle",
    // Société & Environnement
    "Les inégalités sociales au quotidien",
    "La protection de l'environnement au niveau local",
    "L'usage des réseaux sociaux chez les jeunes",
    "Les relations internationales vues par les Français",
    "Le bénévolat et l'action humanitaire",
    "La solidarité entre voisins en milieu urbain",
    "Les défis du logement étudiant",
    "La technologie dans la vie quotidienne",
    // Culture & Arts
    "La culture et les arts en France",
    "La musique française contemporaine",
    "Les festivals et événements culturels",
    "La mode et l'industrie du luxe",
    "Les musées et l'accès à la culture",
    "La lecture et les habitudes livresques",
    "Le cinéma et les séries télévisées",
    "La photographie et les arts visuels",
    "La danse et les arts de la scène",
    "La cuisine régionale française",
  ],

  DALF: [
    "La démocratie participative à l'ère numérique",
    "L'éthique dans la recherche scientifique",
    "Les défis de l'intelligence artificielle générative",
    "La justice sociale et les politiques redistributives",
    "Le patrimoine linguistique face à la globalisation",
    "La bioéthique et les limites de la médecine moderne",
    "La souveraineté numérique européenne",
    "Le rôle de l'État dans l'économie contemporaine",
    "Les migrations climatiques et le droit international",
    "L'éducation aux médias et la lutte contre la désinformation",
    "La philosophie du transhumanisme",
    "Le financement public de la culture",
    "Les droits numériques et la vie privée",
    "L'évolution du contrat social au XXIe siècle",
    "La diplomatie culturelle et le soft power",
    "L'impact sociétal de l'automatisation",
    "Le débat sur la décroissance économique",
    "L'avenir de l'Union Européenne face aux nationalismes",
    "La désindustrialisation et le renouveau économique",
    "L'enseignement supérieur entre excellence et accessibilité",
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let callCount = 0;

async function ask(systemPrompt, userPrompt, maxTokens = 1800) {
  callCount++;
  let lastErr;

  for (let attempt = 0; attempt < groqClients.length + 1; attempt++) {
    const { client, keyIndex } = getGroqClient();
    try {
      const res = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });
      await sleep(600 / groqClients.length); // spread load across keys
      const raw = res.choices[0].message.content.trim();
      return raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    } catch (err) {
      if (err.status === 429) {
        const wait = parseInt(err.headers?.['retry-after'] || '60') * 1000;
        console.log(`\n  Key ${keyIndex + 1}/${groqClients.length} rate-limited — switching (wait ${wait / 1000}s)`);
        cooldownUntil[keyIndex] = Date.now() + wait;
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  // All keys cooling — wait for the shortest cooldown then retry
  const shortest = Math.min(...cooldownUntil) - Date.now();
  if (shortest > 0) {
    console.log(`\n  All keys cooling — waiting ${Math.ceil(shortest / 1000)}s...`);
    await sleep(shortest + 500);
  }
  return ask(systemPrompt, userPrompt, maxTokens);
}

const parseJSON = (str) => {
  try { return JSON.parse(str); }
  catch { throw new Error(`JSON parse failed: ${str.substring(0, 200)}`); }
};

// ─── Section generators ───────────────────────────────────────────────────────

async function generateReadingSection(examType, topic) {
  const isFrench = ['TEF', 'TCF', 'DALF'].includes(examType);
  const lang = isFrench ? 'French' : 'English';
  const wordCount = examType === 'DALF' ? 450 : 300;

  const raw = await ask(
    `You are an expert ${examType} exam writer producing highly realistic, academically rigorous exam content.`,
    `Generate a ${lang} reading section for a ${examType} exam on the topic: "${topic}".

Return a JSON object with this exact structure:
{
  "passage_title": "descriptive title",
  "passage_text": "${wordCount}+ words of ${lang} academic text on the topic",
  "questions": [
    {
      "question_type": "MULTIPLE_CHOICE",
      "question_text": "specific comprehension question about the passage",
      "options": [{"label":"A","text":"option text"},{"label":"B","text":"option text"},{"label":"C","text":"option text"},{"label":"D","text":"option text"}],
      "correct_answer": "A",
      "difficulty": "INTERMEDIATE",
      "tags": ["reading","comprehension"]
    },
    {
      "question_type": "MULTIPLE_CHOICE",
      "question_text": "inference or vocabulary question",
      "options": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],
      "correct_answer": "B",
      "difficulty": "INTERMEDIATE",
      "tags": ["reading","inference"]
    },
    {
      "question_type": "TRUE_FALSE_NOT_GIVEN",
      "question_text": "a statement to judge as True, False, or Not Given based on the passage",
      "options": [{"label":"TRUE","text":"True"},{"label":"FALSE","text":"False"},{"label":"NOT_GIVEN","text":"Not Given"}],
      "correct_answer": "TRUE",
      "difficulty": "INTERMEDIATE",
      "tags": ["reading","true_false"]
    },
    {
      "question_type": "TRUE_FALSE_NOT_GIVEN",
      "question_text": "another statement — make sure some are NOT_GIVEN for realistic difficulty",
      "options": [{"label":"TRUE","text":"True"},{"label":"FALSE","text":"False"},{"label":"NOT_GIVEN","text":"Not Given"}],
      "correct_answer": "NOT_GIVEN",
      "difficulty": "ADVANCED",
      "tags": ["reading","true_false"]
    },
    {
      "question_type": "FILL_IN_BLANK",
      "question_text": "Complete the sentence: The author argues that __________ is the primary cause of the issue.",
      "options": null,
      "correct_answer": "short phrase from passage",
      "difficulty": "INTERMEDIATE",
      "tags": ["reading","vocabulary"]
    }
  ]
}`
  );

  return parseJSON(raw);
}

async function generateListeningSection(examType, topic) {
  const raw = await ask(
    `You are an expert IELTS exam writer producing highly realistic listening section content.`,
    `Generate an English listening section for an IELTS exam. The scenario should relate to: "${topic}".

Return a JSON object:
{
  "section_title": "descriptive title of the listening scenario (e.g., 'Conversation at a university careers fair')",
  "instructions": "instruction text for candidates",
  "questions": [
    {
      "question_type": "FILL_IN_BLANK",
      "question_text": "The event takes place on __________.",
      "options": null,
      "correct_answer": "Saturday afternoon",
      "difficulty": "BEGINNER",
      "tags": ["listening","detail"]
    },
    {
      "question_type": "FILL_IN_BLANK",
      "question_text": "The registration fee is __________ per person.",
      "options": null,
      "correct_answer": "$25",
      "difficulty": "BEGINNER",
      "tags": ["listening","numbers"]
    },
    {
      "question_type": "MULTIPLE_CHOICE",
      "question_text": "What is the main reason the speaker recommends attending?",
      "options": [{"label":"A","text":"networking opportunities"},{"label":"B","text":"free refreshments"},{"label":"C","text":"career workshops"},{"label":"D","text":"certification"}],
      "correct_answer": "A",
      "difficulty": "INTERMEDIATE",
      "tags": ["listening","main_idea"]
    },
    {
      "question_type": "FILL_IN_BLANK",
      "question_text": "Participants should bring their __________ for identification.",
      "options": null,
      "correct_answer": "student ID",
      "difficulty": "INTERMEDIATE",
      "tags": ["listening","instruction"]
    }
  ]
}`
  );

  return parseJSON(raw);
}

async function generateWritingSection(examType, topic, task1Topic) {
  const isFrench = ['TEF', 'TCF', 'DALF'].includes(examType);
  const lang = isFrench ? 'French' : 'English';

  if (examType === 'IELTS') {
    const chartTypes = ['bar', 'line'];
    const chartType = chartTypes[callCount % 2];

    const raw = await ask(
      `You are an expert IELTS Academic exam writer producing realistic Writing tasks with varied, plausible chart data.`,
      `Generate two IELTS Academic Writing tasks.
Task 1 topic: "${task1Topic}"
Task 2 topic: "${topic}"

Return a JSON object:
{
  "questions": [
    {
      "question_type": "ESSAY",
      "question_text": "The chart below shows [specific measurable data related to ${task1Topic}].\\n\\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\\n\\nWrite at least 150 words.",
      "chart_data": {
        "type": "${chartType}",
        "title": "specific descriptive chart title",
        "y_label": "measurement unit (e.g. Percentage (%), Number of people, Tonnes)",
        "x_label": "category label (e.g. Year, Country, Age group)",
        "y_min": 0,
        "y_max": 100,
        "y_unit": "%",
        "x_axis": ["label1","label2","label3","label4","label5"],
        "series": [
          {"label":"Group A","color":"#6C47FF","values":[20,35,50,40,60]},
          {"label":"Group B","color":"#EF4444","values":[45,30,55,70,25]}
        ]
      },
      "difficulty": "INTERMEDIATE",
      "tags": ["writing_task1","data_description","academic"],
      "points": 9
    },
    {
      "question_type": "ESSAY",
      "question_text": "full IELTS Task 2 prompt: present a clear opinion/discussion/problem-solution question about ${topic}. End with: Write at least 250 words.",
      "chart_data": null,
      "difficulty": "INTERMEDIATE",
      "tags": ["writing_task2","opinion_essay"],
      "points": 9
    }
  ]
}`
    );
    return parseJSON(raw);
  }

  const wordMin = examType === 'DALF' ? 250 : 160;
  const raw = await ask(
    `You are an expert ${examType} exam writer producing highly realistic French writing tasks.`,
    `Generate two ${lang} writing tasks for a ${examType} exam on the theme: "${topic}".

Return a JSON object:
{
  "questions": [
    {
      "question_type": "ESSAY",
      "question_text": "realistic ${examType} production écrite prompt in French — formal register, minimum ${wordMin} words",
      "chart_data": null,
      "difficulty": "INTERMEDIATE",
      "tags": ["writing","production_écrite"],
      "points": 25
    },
    {
      "question_type": "ESSAY",
      "question_text": "second ${examType} argumentative writing prompt in French — express and defend a point of view, minimum ${wordMin + 80} words",
      "chart_data": null,
      "difficulty": "ADVANCED",
      "tags": ["writing","argumentation"],
      "points": 25
    }
  ]
}`
  );
  return parseJSON(raw);
}

async function generateSpeakingSection(examType, topic) {
  const isFrench = ['TEF', 'TCF', 'DALF'].includes(examType);
  const lang = isFrench ? 'French' : 'English';

  const raw = await ask(
    `You are an expert ${examType} exam writer producing realistic speaking test prompts.`,
    `Generate ${lang} speaking prompts for a ${examType} exam on the theme: "${topic}".

Return a JSON object:
{
  "questions": [
    {
      "question_type": "SPEAKING_RESPONSE",
      "question_text": "${isFrench
        ? `Partie 1 — Questions personnelles courtes (3-4 questions liées au thème de «${topic}»). Répondez de façon spontanée, 2-3 minutes au total.`
        : `Part 1 — Personal questions\\n\\nAnswer 4-5 questions about your personal experience related to ${topic}. Speak for 1-2 minutes in total.`
      }",
      "difficulty": "BEGINNER",
      "tags": ["speaking","fluency","personal"],
      "points": 9
    },
    {
      "question_type": "SPEAKING_RESPONSE",
      "question_text": "${isFrench
        ? `Partie 2 — Monologue structuré\\n\\nPrésentez votre point de vue sur «${topic}» en 2-3 minutes. Structurez votre réponse avec une introduction, des arguments et une conclusion.`
        : `Part 2 — Individual Long Turn\\n\\nDescribe a specific aspect of ${topic} using the cue card below:\\n• What it is\\n• How it affects people\\n• What changes you have noticed\\n• Whether you think this is positive or negative\\n\\nSpeak for 1-2 minutes.`
      }",
      "difficulty": "INTERMEDIATE",
      "tags": ["speaking","long_turn","structure"],
      "points": 9
    }
  ]
}`
  );
  return parseJSON(raw);
}

// ─── Exam assembler ───────────────────────────────────────────────────────────

async function generateFullExam(examType, examNumber, topic, task1Topic) {
  const isFrench = ['TEF', 'TCF', 'DALF'].includes(examType);
  const examTitle = isFrench
    ? `${examType} — Entraînement #${examNumber} : ${topic.split(' ').slice(0, 5).join(' ')}`
    : `${examType} Academic Mock Test #${examNumber} — ${topic.split(' ').slice(0, 4).join(' ')}`;

  console.log(`\n  📚 Topic: "${topic}"`);

  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .insert({
      exam_type: examType,
      title: examTitle,
      description: isFrench
        ? `Entraînement complet ${examType} sur le thème : ${topic}.`
        : `Full-length ${examType} practice test covering ${topic.toLowerCase()}. Mirrors real exam format and difficulty.`,
      difficulty: 'INTERMEDIATE',
      skills: isFrench
        ? ['READING', 'WRITING', 'SPEAKING']
        : ['READING', 'LISTENING', 'WRITING', 'SPEAKING'],
      total_duration_minutes: isFrench ? 135 : 195,
      is_free: false,
      is_published: true,
      version: 1,
      metadata: { generated_by: 'groq', topic },
    })
    .select()
    .single();

  if (examErr) throw new Error(`Exam insert failed: ${examErr.message}`);
  const examId = exam.id;
  let sectionOrder = 1;

  // Reading
  process.stdout.write('  [R] Reading... ');
  const reading = await generateReadingSection(examType, topic);
  const { data: readingSection } = await supabase
    .from('exam_sections')
    .insert({
      exam_id: examId,
      skill: 'READING',
      title: reading.passage_title || `Reading — ${topic}`,
      instructions: `Read the passage carefully and answer all questions.`,
      passage_text: reading.passage_text,
      duration_minutes: isFrench ? 35 : 60,
      order_index: sectionOrder++,
    })
    .select().single();
  await insertQuestions(reading.questions, readingSection.id, examType, 'READING');
  process.stdout.write(`✓(${reading.questions.length})  `);

  // Listening (IELTS only)
  if (!isFrench) {
    process.stdout.write('[L] Listening... ');
    const listening = await generateListeningSection(examType, topic);
    const { data: listenSection } = await supabase
      .from('exam_sections')
      .insert({
        exam_id: examId,
        skill: 'LISTENING',
        title: listening.section_title || `Listening — ${topic}`,
        instructions: listening.instructions || 'Listen to the recording and answer the questions.',
        duration_minutes: 40,
        order_index: sectionOrder++,
      })
      .select().single();
    await insertQuestions(listening.questions, listenSection.id, examType, 'LISTENING');
    process.stdout.write(`✓(${listening.questions.length})  `);
  }

  // Writing
  process.stdout.write('[W] Writing... ');
  const writing = await generateWritingSection(examType, topic, task1Topic || topic);
  const { data: writeSection } = await supabase
    .from('exam_sections')
    .insert({
      exam_id: examId,
      skill: 'WRITING',
      title: 'Writing Tasks',
      instructions: isFrench
        ? 'Répondez aux deux tâches de production écrite.'
        : 'Complete both writing tasks. Task 1: minimum 150 words. Task 2: minimum 250 words.',
      duration_minutes: 60,
      order_index: sectionOrder++,
    })
    .select().single();
  await insertQuestions(writing.questions, writeSection.id, examType, 'WRITING');
  process.stdout.write(`✓(${writing.questions.length})  `);

  // Speaking
  process.stdout.write('[S] Speaking... ');
  const speaking = await generateSpeakingSection(examType, topic);
  const { data: speakSection } = await supabase
    .from('exam_sections')
    .insert({
      exam_id: examId,
      skill: 'SPEAKING',
      title: 'Speaking Test',
      instructions: isFrench
        ? 'Répondez oralement aux questions de façon claire et structurée.'
        : 'Speak naturally and clearly. The examiner will guide you through each part.',
      duration_minutes: 15,
      order_index: sectionOrder++,
    })
    .select().single();
  await insertQuestions(speaking.questions, speakSection.id, examType, 'SPEAKING');
  console.log(`✓(${speaking.questions.length})`);

  return examId;
}

async function insertQuestions(questions, sectionId, examType, skill) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await supabase.from('questions').insert({
      section_id: sectionId,
      exam_type: examType,
      question_type: q.question_type,
      skill,
      order_index: i + 1,
      question_text: q.question_text,
      options: q.options || null,
      correct_answer: q.correct_answer || null,
      answer_explanation: q.answer_explanation || null,
      chart_data: q.chart_data || null,
      points: q.points || 1,
      difficulty: q.difficulty || 'INTERMEDIATE',
      tags: q.tags || [],
      ai_generated: true,
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const EXAM_TYPES = TARGET_TYPE ? [TARGET_TYPE] : ['IELTS', 'TEF', 'TCF', 'DALF'];
  const DALF_CAP = Math.min(TARGET_EXAMS, TOPICS.DALF.length);
  const EXAM_COUNTS = {
    IELTS: Math.min(TARGET_EXAMS, TOPICS.IELTS.length),
    TEF:   Math.min(TARGET_EXAMS, TOPICS.TEF.length),
    TCF:   Math.min(TARGET_EXAMS, TOPICS.TCF.length),
    DALF:  DALF_CAP,
  };

  let totalExams = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  const totalPlanned = EXAM_TYPES.reduce((s, t) => s + EXAM_COUNTS[t], 0);
  const avgQ = 12;
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Examify Question Bank Generator (Groq — ${groqClients.length} key(s))`);
  console.log(`  Types: ${EXAM_TYPES.join(', ')}`);
  console.log(`  Planned: ${totalPlanned} exams ≈ ${totalPlanned * avgQ}+ questions`);
  console.log(`  Estimated time: ~${Math.round(totalPlanned * 4 * 4.5 / 60)} minutes`);
  console.log('═══════════════════════════════════════════════════');

  for (const examType of EXAM_TYPES) {
    const count = EXAM_COUNTS[examType];
    const topics = TOPICS[examType];
    console.log(`\n▶ Generating ${count} ${examType} exam(s)...\n`);

    for (let i = 0; i < count; i++) {
      const examNumber = i + 1;
      const topic = topics[i % topics.length];
      const task1Topic = topics[(i + Math.floor(topics.length / 2)) % topics.length];

      process.stdout.write(`  [${examNumber}/${count}] ${examType} #${examNumber} — `);
      try {
        await generateFullExam(examType, examNumber, topic, task1Topic);
        console.log(`  ✅ saved`);
        totalExams++;
      } catch (err) {
        console.log(`\n  ❌ Failed: ${err.message}`);
        totalFailed++;
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Done! ${totalExams} exams created, ${totalFailed} failed`);
  console.log(`  Groq API calls: ${callCount} across ${groqClients.length} key(s)`);
  console.log(`  Time: ${mins}m ${secs}s`);
  console.log(`  Estimated questions added: ~${totalExams * avgQ}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(err => { console.error(err.message); process.exit(1); });
