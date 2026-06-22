-- =====================================================================
-- Seed data. Run AFTER 0001_init.sql and 0002_storage.sql.
-- Image paths point at /courses/*.png assets shipped in /public; replace
-- with public-images Storage URLs once images are uploaded there.
-- =====================================================================

-- consultation_types -------------------------------------------------
insert into public.consultation_types (id, title, description, cal_event_slug, price, duration, sort_order)
values
  ('chat',  'Chat Consultation', 'Text-based consultation through the website chat.', 'chat',  299, 30, 1),
  ('audio', 'Voice Call',        'Audio consultation over Google Meet.',            'audio', 499, 30, 2),
  ('video', 'Video Call',        'Face-to-face video consultation over Google Meet.','video', 799, 30, 3)
on conflict (id) do nothing;

-- courses -------------------------------------------------------------
insert into public.courses (title, price, image, description, sort_order)
values
  ('Be Expert in Future Consultation in All Astrology', 11000, '/courses/course-expert.png',
   'In this comprehensive Vedic Astrology course, we provide 6,000 minutes of training divided into 150 classes of 40 minutes each. You can complete this course in 50 to 150 days, depending on how many classes you choose to attend daily. We teach you Vedic astrology, Vastu, Numerology, Lal Kitab, and everything required to become an expert in future consultation. We have 7 batches running daily, so we can manage a batch that fits your schedule.', 1),
  ('Full Vastu Course', 7000, '/courses/course-vastu.png',
   'In this comprehensive Vastu course, we provide 3,600 minutes of training divided into 90 classes of 40 minutes each. You can complete this course in 50 to 90 days, depending on your daily attendance. We teach you complete Vastu Shastra along with all remedial solution techniques to make you an expert in Vastu consultation. We have 7 batches running daily to fit your schedule.', 2),
  ('Lalkitab Remedies', 5000, '/courses/course-lalkitab.png',
   'In this course, we provide 2,400 minutes of training divided into 60 classes of 40 minutes each. You can complete this course sooner by taking multiple classes a day. We teach you complete Lal Kitab predictions, remedies, and everything required to become an expert in future consultation. We have 7 batches running daily to accommodate your schedule.', 3),
  ('Numerology', 5000, '/courses/course-numerology.png',
   'In this course, we provide 2,400 minutes of training divided into 60 classes of 40 minutes each. You can complete this course in 30 to 60 days based on your daily attendance. We teach you complete Numerology and Tarot predictions for all types of queries, making you an expert in future consultation. We have 7 batches running daily to fit your availability.', 4),
  ('Vedic Astrology', 5000, '/courses/course-vedic.png',
   'In this course, we provide 3,600 minutes of training divided into 90 classes of 40 minutes each. You can complete this course in 50 to 90 days, depending on your daily attendance. We teach you comprehensive Vedic Astrology principles and predictive techniques to make you an expert in astrological consultation. We have 7 batches running daily to accommodate your schedule.', 5)
on conflict do nothing;

-- site_content --------------------------------------------------------
insert into public.site_content (key, value) values
  ('home_stats', '[
     {"value":"22+","label":"Years Experience"},
     {"value":"50k+","label":"Happy Clients"},
     {"value":"100+","label":"Countries Served"},
     {"value":"24/7","label":"Support"}
   ]'::jsonb),
  ('hero', '{
     "titleLead":"Navigate Your Destiny with",
     "titleHighlight":"Astro Dilip Sharma",
     "subtitle":"India''s premier astrologer. Discover the cosmic blueprint of your life with expert Vedic astrology, numerology, and Vastu consultations.",
     "ratingBadge":"4.8/5 Rated in Astrotalk"
   }'::jsonb),
  ('astrologer_bio', '{
     "name":"Astro Dilip Sharma",
     "rating":"4.8",
     "years":22,
     "clients":"50k+",
     "bio":"India''s premier astrologer with over 22 years of experience in Vedic astrology, numerology, and Vastu."
   }'::jsonb)
on conflict (key) do nothing;

-- default blogs -------------------------------------------------------
insert into public.blogs (title, excerpt, display_date, author, image, status)
values
  ('Understanding Planetary Transits in 2026',
   'Astro Dilip Sharma explains how the major transits of Saturn and Jupiter will impact your sun sign this year...',
   'May 15, 2026', 'Astro Dilip Sharma', '/courses/new-planetary transits.png', 'published'),
  ('How Vastu Changed My Business',
   'After struggling for years, applying simple Vastu remedies suggested by Astro Dilip transformed my workspace energy...',
   'May 10, 2026', 'Priya M. (Client Experience)', '/courses/new-vastu.png', 'published'),
  ('The Power of Lal Kitab Remedies',
   'Why Lal Kitab is considered one of the most practical and effective branches of astrology in the modern era.',
   'May 2, 2026', 'Astro Dilip Sharma', '/courses/new-lalkitab.jpg', 'published')
on conflict do nothing;

-- =====================================================================
-- After a real admin signs up via the app, promote them once:
--   update public.profiles set role = 'admin' where email = 'ADMIN_EMAIL_HERE';
-- =====================================================================
