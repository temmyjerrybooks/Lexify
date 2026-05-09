-- =============================================================
-- EXAMIFY SEED DATA
-- Sample exams, sections, and questions for development/testing
-- =============================================================

-- ───────────────────────────────────────────────
-- IELTS ACADEMIC MOCK EXAM #1
-- ───────────────────────────────────────────────

INSERT INTO public.exams (id, exam_type, title, description, difficulty, skills, total_duration_minutes, is_free, is_published)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'IELTS',
  'IELTS Academic Mock Test #1',
  'Full-length IELTS Academic practice test covering all four skills. Closely mirrors the real exam format and difficulty.',
  'INTERMEDIATE',
  ARRAY['READING', 'LISTENING', 'WRITING', 'SPEAKING']::exam_skill[],
  195,  -- 60 reading + 40 listening + 60 writing + 15 speaking + 20 buffer
  TRUE,
  TRUE
);

-- Reading Section
INSERT INTO public.exam_sections (id, exam_id, skill, title, instructions, duration_minutes, order_index, passage_text)
VALUES (
  'a1b2c3d4-0000-0000-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'READING',
  'Reading Passage 1: The History of Urban Parks',
  'Read the following passage carefully and answer questions 1-13. You should spend approximately 20 minutes on this section.',
  60,
  1,
  'Urban parks as we know them today are a relatively recent invention, emerging primarily during the nineteenth century as cities expanded rapidly due to industrialization. Before this era, green spaces in cities were largely the preserve of the wealthy — private gardens attached to grand houses, or royal hunting grounds that the public could rarely access.

The transformation began in earnest in Britain. London''s Hyde Park, while originally a royal hunting ground established by Henry VIII in 1536, was first opened to the public in the early seventeenth century. However, it was not until the 1840s that the concept of purpose-built public parks specifically designed for the working classes began to take hold. Birkenhead Park in Merseyside, opened in 1847 and designed by Joseph Paxton, is widely considered the world''s first publicly funded civic park. Crucially, it was designed from the outset to be accessible to all citizens, regardless of social class.

The influence of Birkenhead Park spread rapidly across the Atlantic. When the American landscape architect Frederick Law Olmsted visited in 1850, he was profoundly moved by the democratic spirit of the design. He returned to the United States inspired, and went on to design Central Park in New York City — arguably the world''s most famous urban park — which opened in 1858. Olmsted''s philosophy was that parks should be spaces of moral and social improvement, places where the poor could breathe fresh air and escape the squalor of overcrowded tenements.

This social function of parks has evolved considerably in the contemporary era. Research published in the Journal of Environmental Psychology suggests that access to green urban spaces is associated with measurably lower levels of cortisol — a key stress hormone — in city residents. A 2019 study conducted across 14 European cities found that residents living within 300 metres of a park reported significantly higher levels of life satisfaction than those living further away.

Yet access to parks remains deeply unequal. A 2021 analysis of 100 American cities found that low-income neighborhoods had, on average, 44% less park space per resident than high-income neighborhoods. Communities of color had even less. This disparity, sometimes termed "park poverty," has become a focal point for urban planners and social justice advocates alike.

The design of parks is also changing in response to climate change. Cities are increasingly using parks as part of "green infrastructure" strategies — networks of natural and semi-natural spaces designed to deliver ecological services such as flood management, urban cooling, and biodiversity. Singapore, for instance, has made the integration of nature into its urban fabric a central pillar of city planning, earning it a reputation as the world''s "City in a Garden."'
);

-- Reading Questions for Passage 1
INSERT INTO public.questions (section_id, question_type, skill, exam_type, order_index, question_text, options, correct_answer, answer_explanation, points, difficulty, tags)
VALUES
(
  'a1b2c3d4-0000-0000-0001-000000000001',
  'MULTIPLE_CHOICE',
  'READING',
  'IELTS',
  1,
  'According to the passage, what was the significance of Birkenhead Park?',
  '[{"label":"A","text":"It was the first park ever built in Britain"},{"label":"B","text":"It was designed by Frederick Law Olmsted"},{"label":"C","text":"It was the first publicly funded civic park designed for all citizens"},{"label":"D","text":"It was built on a former royal hunting ground"}]',
  'C',
  'The passage states Birkenhead Park "is widely considered the world''s first publicly funded civic park" and "was designed from the outset to be accessible to all citizens, regardless of social class."',
  1,
  'INTERMEDIATE',
  ARRAY['reading_comprehension', 'detail', 'parks', 'history']
),
(
  'a1b2c3d4-0000-0000-0001-000000000001',
  'TRUE_FALSE_NOT_GIVEN',
  'READING',
  'IELTS',
  2,
  'Frederick Law Olmsted visited Birkenhead Park before designing Central Park.',
  '[{"label":"TRUE","text":"True"},{"label":"FALSE","text":"False"},{"label":"NOT_GIVEN","text":"Not Given"}]',
  'TRUE',
  'The passage explicitly states: "When the American landscape architect Frederick Law Olmsted visited in 1850, he was profoundly moved... He returned to the United States inspired, and went on to design Central Park."',
  1,
  'BEGINNER',
  ARRAY['true_false', 'detail', 'parks', 'history']
),
(
  'a1b2c3d4-0000-0000-0001-000000000001',
  'MULTIPLE_CHOICE',
  'READING',
  'IELTS',
  3,
  'What does the 2021 analysis reveal about park access in American cities?',
  '[{"label":"A","text":"All neighborhoods have equal access to parks"},{"label":"B","text":"Low-income areas have significantly less park space per person"},{"label":"C","text":"Communities of color have more parks than high-income areas"},{"label":"D","text":"Park poverty only affects rural areas"}]',
  'B',
  'The passage states: "low-income neighborhoods had, on average, 44% less park space per resident than high-income neighborhoods."',
  1,
  'INTERMEDIATE',
  ARRAY['reading_comprehension', 'statistics', 'inequality']
);

-- Listening Section
INSERT INTO public.exam_sections (id, exam_id, skill, title, instructions, duration_minutes, order_index, audio_url)
VALUES (
  'a1b2c3d4-0000-0000-0001-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'LISTENING',
  'Listening Section 1: University Accommodation Enquiry',
  'Listen to the recording and answer questions 1-10. You will hear each section once. Write your answers as you listen.',
  40,
  2,
  'https://your-supabase-project.supabase.co/storage/v1/object/public/exam-audio/ielts-mock1-listening-s1.mp3'
);

INSERT INTO public.questions (section_id, question_type, skill, exam_type, order_index, question_text, correct_answer, points, difficulty, tags)
VALUES
(
  'a1b2c3d4-0000-0000-0001-000000000002',
  'FILL_IN_BLANK',
  'LISTENING',
  'IELTS',
  1,
  'The student wants to book accommodation from __________ September.',
  '15th',
  1,
  'BEGINNER',
  ARRAY['listening_detail', 'dates', 'accommodation']
),
(
  'a1b2c3d4-0000-0000-0001-000000000002',
  'FILL_IN_BLANK',
  'LISTENING',
  'IELTS',
  2,
  'The monthly rent for a single room is £__________.',
  '650',
  1,
  'INTERMEDIATE',
  ARRAY['listening_detail', 'numbers', 'accommodation']
);

-- Writing Section
INSERT INTO public.exam_sections (id, exam_id, skill, title, instructions, duration_minutes, order_index)
VALUES (
  'a1b2c3d4-0000-0000-0001-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'WRITING',
  'Writing Tasks',
  'Complete both writing tasks. Task 1 requires at least 150 words. Task 2 requires at least 250 words. Task 2 carries more marks.',
  60,
  3
);

INSERT INTO public.questions (section_id, question_type, skill, exam_type, order_index, question_text, points, difficulty, tags)
VALUES
(
  'a1b2c3d4-0000-0000-0001-000000000003',
  'ESSAY',
  'WRITING',
  'IELTS',
  1,
  'The chart below shows the percentage of households in different income groups that owned at least one car in a European country between 1990 and 2020.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.',
  9,  -- Out of 9 (IELTS band scale)
  'INTERMEDIATE',
  ARRAY['writing_task1', 'chart_description', 'data_analysis', 'academic']
),
(
  'a1b2c3d4-0000-0000-0001-000000000003',
  'ESSAY',
  'WRITING',
  'IELTS',
  2,
  'In many countries, the gap between the rich and the poor is widening. What problems does this cause? What measures could be taken to address these problems?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.',
  9,
  'INTERMEDIATE',
  ARRAY['writing_task2', 'opinion_essay', 'society', 'inequality']
);

-- Speaking Section
INSERT INTO public.exam_sections (id, exam_id, skill, title, instructions, duration_minutes, order_index)
VALUES (
  'a1b2c3d4-0000-0000-0001-000000000004',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'SPEAKING',
  'Speaking Test',
  'The IELTS Speaking test has three parts. Speak naturally and clearly. There are no right or wrong answers.',
  15,
  4
);

INSERT INTO public.questions (section_id, question_type, skill, exam_type, order_index, question_text, points, difficulty, tags)
VALUES
(
  'a1b2c3d4-0000-0000-0001-000000000004',
  'SPEAKING_RESPONSE',
  'SPEAKING',
  'IELTS',
  1,
  'Part 1 — Introduction and Interview

Answer the following questions naturally:
1. Can you tell me your full name and where you are from?
2. Do you enjoy reading? Why or why not?
3. How often do you use public parks or outdoor spaces?
4. What kind of music do you like to listen to?

Speak for 1-2 minutes total.',
  9,
  'INTERMEDIATE',
  ARRAY['speaking_part1', 'personal_questions', 'fluency']
),
(
  'a1b2c3d4-0000-0000-0001-000000000004',
  'SPEAKING_RESPONSE',
  'SPEAKING',
  'IELTS',
  2,
  'Part 2 — Individual Long Turn

You have 1 minute to prepare, then speak for 1-2 minutes on the following topic:

Describe a place in your country that you would recommend to a visitor.

You should say:
• where it is
• what it looks like
• what you can do there
• and explain why you would recommend it',
  9,
  'INTERMEDIATE',
  ARRAY['speaking_part2', 'description', 'places', 'long_turn']
);

-- ───────────────────────────────────────────────
-- TEF CANADA MOCK EXAM #1
-- ───────────────────────────────────────────────

INSERT INTO public.exams (id, exam_type, title, description, difficulty, skills, total_duration_minutes, is_free, is_published)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'TEF',
  'TEF Canada Préparation — Complet',
  'Examen complet de préparation au TEF Canada. Couvre les 4 compétences : compréhension orale, compréhension écrite, expression orale et expression écrite.',
  'INTERMEDIATE',
  ARRAY['READING', 'LISTENING', 'WRITING', 'SPEAKING']::exam_skill[],
  240,
  FALSE,
  TRUE
);

-- TEF Reading Section
INSERT INTO public.exam_sections (id, exam_id, skill, title, instructions, duration_minutes, order_index, passage_text)
VALUES (
  'b2c3d4e5-0000-0000-0001-000000000005',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'READING',
  'Compréhension des écrits',
  'Lisez attentivement les textes suivants et répondez aux questions. Vous avez 60 minutes pour répondre à 50 questions.',
  60,
  1,
  'Le télétravail en France : une révolution silencieuse

La pandémie de COVID-19 a profondément transformé les habitudes de travail en France. Si le télétravail existait bien avant 2020, il est passé en quelques semaines d''une pratique marginale concernant moins de 7 % des salariés à une nécessité imposée à plus de 40 % de la population active.

Selon une étude publiée par la DARES (Direction de l''Animation de la Recherche, des Études et des Statistiques) en 2023, 30 % des salariés français pratiquent désormais le télétravail de manière régulière, soit au moins un jour par semaine. Ce chiffre représente une multiplication par quatre par rapport à la période pré-pandémique.

Les avantages perçus sont nombreux. Pour les salariés, l''économie de temps liée aux transports figure en tête des bénéfices cités : en Île-de-France, un actif passe en moyenne 1 heure 20 minutes par jour dans les transports en commun. La réduction de ce temps de trajet se traduit par une amélioration significative de la qualité de vie. De plus, une majorité de télétravailleurs déclarent être plus productifs à domicile qu''au bureau, notamment pour les tâches nécessitant une forte concentration.

Cependant, le télétravail n''est pas sans inconvénients. L''isolement social constitue le principal problème identifié : 35 % des télétravailleurs réguliers déclarent se sentir moins intégrés dans la culture d''entreprise. Par ailleurs, la frontière entre vie professionnelle et vie personnelle tend à s''estomper, certains salariés peinant à « déconnecter » en dehors des heures de bureau.'
);

INSERT INTO public.questions (section_id, question_type, skill, exam_type, order_index, question_text, options, correct_answer, points, difficulty, tags)
VALUES
(
  'b2c3d4e5-0000-0000-0001-000000000005',
  'MULTIPLE_CHOICE',
  'READING',
  'TEF',
  1,
  'Selon l''article, quel pourcentage de salariés français pratiquent le télétravail régulièrement en 2023 ?',
  '[{"label":"A","text":"7 %"},{"label":"B","text":"30 %"},{"label":"C","text":"40 %"},{"label":"D","text":"50 %"}]',
  'B',
  1,
  'INTERMEDIATE',
  ARRAY['comprehension', 'statistiques', 'télétravail']
),
(
  'b2c3d4e5-0000-0000-0001-000000000005',
  'MULTIPLE_CHOICE',
  'READING',
  'TEF',
  2,
  'Quel est le principal inconvénient du télétravail mentionné dans l''article ?',
  '[{"label":"A","text":"La réduction de la productivité"},{"label":"B","text":"L''isolement social"},{"label":"C","text":"Les problèmes techniques"},{"label":"D","text":"La distance avec les clients"}]',
  'B',
  1,
  'INTERMEDIATE',
  ARRAY['comprehension', 'detail', 'télétravail', 'problèmes']
);
