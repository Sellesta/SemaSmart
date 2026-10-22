-- Run after any seed script: the seeds insert explicit ids and leave the sequences behind
SELECT setval(pg_get_serial_sequence('courses', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM courses;
SELECT setval(pg_get_serial_sequence('units', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM units;
SELECT setval(pg_get_serial_sequence('lessons', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM lessons;
SELECT setval(pg_get_serial_sequence('challenges', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM challenges;
SELECT setval(pg_get_serial_sequence('challenge_options', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM challenge_options;
SELECT setval(pg_get_serial_sequence('challenge_progress', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM challenge_progress;
