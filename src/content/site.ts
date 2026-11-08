/**
 * Everything the public CoachMe2.world pages say, in one place.
 * Edit text, people, and links here; the pages read from this file.
 * Carried over from the previous coachme2-world.vercel.app site.
 */

export const LINKS = {
  discoveryCall: "https://calendar.app.google/6oreM19iu42MbPJb6",
  zeffyEmbed: "https://www.zeffy.com/embed/donation-form/make-a-difference-30",
  newsletter: "https://forms.gle/suNYqzDbA6tYe6AN9",
  email: "rebecca@coachme2.world",
  social: [
    { label: "Instagram", short: "IG", href: "https://www.instagram.com/coachme_2" },
    { label: "TikTok", short: "TT", href: "https://www.tiktok.com/@coachme225" },
    { label: "YouTube", short: "YT", href: "https://www.youtube.com/@CoachMe2-v4c" },
    { label: "Facebook", short: "FB", href: "https://www.facebook.com/share/1CfiN9P6i5/?mibextid=wwXIfr" },
  ],
} as const;

export const CRISIS_NOTE =
  "Coaching is not therapy or crisis care. If you are in immediate danger, call local emergency services. In the U.S., call or text 988.";

/** Artwork used around the site (copied locally by `npm run site:assets`). */
export const ART = {
  oneOnOne: "/illustrations/one-on-one.svg",
  group: "/illustrations/group.svg",
  evolved: "/illustrations/evolved.svg",
  decisionMaking: "/illustrations/decision-making.svg",
  desk: "/photos/life/desk.jpg",
  founder: "/photos/rebecca-oertell.jpg",
} as const;

export type NavGroup = { label: string; items: Array<{ href: string; label: string; blurb?: string }> };

/** One menu for the whole site. */
export const NAV: NavGroup[] = [
  {
    label: "About",
    items: [
      { href: "/about", label: "Mission & story", blurb: "Why every teen deserves a coach" },
      { href: "/meet-our-coaches", label: "Coaches", blurb: "Credentialed, ready when you are" },
      { href: "/team", label: "Board", blurb: "Who keeps us accountable" },
      { href: "/innovators", label: "Interns & innovators", blurb: "Students building Coach Me 2" },
    ],
  },
  {
    label: "Coaching",
    items: [
      { href: "/services", label: "1:1 coaching", blurb: "A dedicated coach, your goals" },
      { href: "/group-experiences", label: "Group coaching", blurb: "Find your ikigai with a crew" },
      { href: "/content", label: "EvolvED leadership", blurb: "A 12-week leadership lab" },
      { href: "/decision-making", label: "Decision making", blurb: "Coming soon" },
    ],
  },
  {
    label: "Who it's for",
    items: [
      { href: "/teens", label: "Teens", blurb: "You call the shots" },
      { href: "/parents", label: "Parents", blurb: "How coaching works" },
      { href: "/partners", label: "Schools & partners", blurb: "Bring coaching to more teens" },
    ],
  },
  {
    label: "Explore",
    items: [
      { href: "/student-resources", label: "Student resources", blurb: "Crisis lines, college, wellbeing" },
      { href: "/podcast", label: "Podcast", blurb: "Teens and coaches, talking honestly" },
      { href: "/research", label: "Research", blurb: "What our interns are finding" },
      { href: "/hub", label: "Coach Me 2 hub", blurb: "Everything in one place" },
    ],
  },
  {
    label: "Get involved",
    items: [
      { href: "/volunteer", label: "Volunteer or intern", blurb: "Find your lane" },
      { href: "/donate", label: "Donate", blurb: "Keep coaching affordable" },
      { href: "/contact", label: "Contact us", blurb: "We'd love to hear from you" },
    ],
  },
];

export const HOME_PROGRAMS = [
  {
    href: "/services",
    title: "1:1 Coaching",
    body: "A quiet, dedicated space to think. Clarify what matters, navigate challenges, and turn personal, academic, and professional goals into action.",
    cta: "Explore services",
    art: "/illustrations/one-on-one.svg",
  },
  {
    href: "/group-experiences",
    title: "Group experiences",
    body: "Ikigai, decisions, courage, and comfort with discomfort — in a cohort that takes the work seriously.",
    cta: "See groups",
    art: "/illustrations/group.svg",
  },
  {
    href: "/content",
    title: "EvolvED",
    body: "A 12-week leadership lab. Lead yourself first. Then influence others — with a certificate you can actually use.",
    cta: "Discover EvolvED",
    art: "/illustrations/evolved.svg",
  },
];

/** The old site showed these cut short; the full quotes weren't on the page. Paste the full text in when you have it. */
export const TESTIMONIALS = [
  {
    quote:
      "The coaching process was honestly amazing. Before I started my life was unorganized and very stressful. During the process I created systems with the help of my coach that made school less stressful. I would recommend it to any student!",
    who: "Anonymous, 16",
  },
  {
    quote:
      "I never felt judged by her during our sessions but nor did I feel let off the hook too easily. She knew exactly when and how to challenge an…",
    who: "Henry S.",
  },
  {
    quote:
      "She listened and encouraged me to see who I wanted to become. She guided me to identify what my motivations were, what I wanted to achieve, …",
    who: "Helga",
  },
  {
    quote:
      "I learned how to goal set with my coach Rhea, who would frequently check in on me outside of our meetings. I felt supported and heard in eve…",
    who: "Sanjana U., 17",
  },
];

export const FEATURED_QUOTE = {
  quote:
    "The biggest benefit of having a coach was knowing I had someone who genuinely believed in me and helped me grow into a more confident, thoughtful, and resilient person.",
  who: "S.S., age 17",
};

/** "You deserve a coach if…" cards. Each opens the short check-in quiz. */
export const QUIZ_PROMPTS = [
  { text: "You can't concentrate, stop scrolling, or stay motivated in school.", art: "/illustrations/focus.svg" },
  { text: "You want new hobbies, a club, or friends — but trying feels terrifying.", art: "/illustrations/belong.svg" },
  {
    text: "You know you should move, eat differently, or take meds… and you just can't make it happen.",
    art: "/illustrations/energy.svg",
  },
  { text: "You're going through the motions. Everyone else's life. None of your time.", art: "/illustrations/motion.svg" },
  { text: "It feels like everyone is pulling ahead and you're stuck.", art: "/illustrations/stuck.svg" },
  { text: "You want to thrive in high school — not just survive it.", art: "/illustrations/thrive.svg" },
];

export const QUIZ_STEPS = [
  {
    question: "How often does this show up?",
    options: ["Once in a while", "Some weeks more than others", "Most days", "It's taking over"],
  },
  {
    question: "What would feel most useful right now?",
    options: ["A coach in my corner", "A group of peers", "Just tools and resources", "Not sure yet"],
  },
];

/** What the portal does, shown on the home page. */
export const APP_FEATURES = [
  { icon: "💬", title: "Chat with your coach", body: "Private, between you and your coach. Parents get logistics, not your conversations." },
  { icon: "🎯", title: "Daily goal check-ins", body: "Set goals with your coach and check in each day. Streaks keep you honest." },
  { icon: "⌚", title: "Apple Watch reminders", body: "Session and goal reminders tap your wrist. No app store needed." },
  { icon: "📅", title: "Sessions in your calendar", body: "One tap adds every session to your phone's calendar, and updates itself." },
  { icon: "🧭", title: "Values & world view", body: "Find what matters most to you and see how it shapes your choices." },
  { icon: "🏆", title: "Achievement portfolio", body: "Collect what you've built and proud moments for college and job apps." },
];

export const COACHING_IS_NOT = [
  { title: "Not consulting", body: "Consultants tell you what to do. You remain the expert." },
  { title: "Not teaching", body: "Teachers decide what you should know. We follow what matters to you." },
  { title: "Not mentoring", body: "Mentors show their path. We help you design yours." },
  { title: "Not therapy", body: "Therapists diagnose and treat. We help you thrive." },
];

export type Person = {
  name: string;
  role: string;
  place?: string;
  photo?: string;
  short: string;
  bio: string[];
  website?: string;
};

export const COACHES: Person[] = [
  {
    name: "Rebecca O.",
    role: "Founder · NBC-HWC",
    photo: "/photos/rebecca-oertell.jpg",
    short: "Founder. Creates a safe space so high school years feel meaningful.",
    bio: [
      "Rebecca is a National Board Certified Health & Wellness Coach (NBC-HWC) and is the founder of coachme2.world. She is passionate about providing teens with a safe space to make their high school years more meaningful, so they don’t just go through the motions but actually feel motivated, connected, confident, and in charge of their current lives and their future.",
      "She’ll help you strengthen your mindset, boost your inner drive, calm your inner critic, and believe in your ability to achieve anything you set your mind to. With Rebecca by your side, you'll build powerful habits that set you up for success—not just in high school, but in college, your career, and beyond. Contact Rebecca directly at rebecca@coachme2.world.",
    ],
  },
  {
    name: "Hannah A.",
    role: "Wellcoaches Certified",
    photo: "/photos/hannah-a.jpg",
    short: "Warm, intuitive, and studying to be a Registered Nurse.",
    bio: [
      "Hannah has a bachelor’s degree in Psychology and is a Wellcoaches Certified Health & Well-being Coach. She is currently studying to be a Registered Nurse. Passionate about women’s health and holistic wellness, she believes in the power of lifestyle medicine to create lasting transformation.",
      "With a warm and intuitive approach, Hannah guides her clients through a journey of self-discovery, clarity, and empowerment. Her mission? To help you unlock your inner strength, cultivate balance, and step fully into the dream version of yourself—healthy, radiant, and thriving.",
    ],
  },
  {
    name: "Rhea A.",
    role: "Wellcoaches Certified",
    photo: "/photos/rhea-a.jpg",
    short: "Turns strengths and confidence into habits that last.",
    bio: [
      "Rhea holds a master’s degree in Kinesiology and a bachelor’s in Exercise Science with a minor in Psychology. Rhea is also a Wellcoaches Certified Health & Well-being Coach. Guided by a passion for holistic health, she is committed to creating a safe and supportive environment where teens can explore their strengths, uncover their passions, and build confidence in themselves. Through developing healthy habits and a strong mindset, she aims to guide teens to see their unique greatness and be empowered to achieve their goals.",
      "Rhea is here to support you in navigating your high school years and beyond with confidence and mindfulness.",
    ],
  },
  {
    name: "Robyn J.",
    role: "ICF PCC · Wellbeing & Relationship",
    photo: "/photos/robyn-j.jpg",
    short: "Kindness, play, and partnerships that expand CoachMe2's reach.",
    website: "https://www.coachingforwellbeing.net",
    bio: [
      "Robyn is a Wellbeing & Relationship Coach with her PCC (Professional Certified Coach) credential from the International Coaching Federation (ICF). She has a BS degree in psychology and marketing & learning/certification in massage therapy, Nonviolent Communication, mindfulness, creative arts & movement and integrates these tools into her coaching with kids to adults. Robyn weaves her core values of kindness, healthy lifestyle, authenticity, playfulness, love of nature and creativity into facilitating learning and growth opportunities for both individual one on one sessions and groups.",
      "Robyn helps expand CoachMe2’s impact by developing partnerships with organizations that support teen well-being and by contributing to the design and development of our coaching initiatives. When not helping at CoachMe2, Robyn is busy running her own coaching practice.",
    ],
  },
  {
    name: "Shahnaz B.",
    role: "Youth Well-being & Career",
    photo: "/photos/shahnaz-b.jpg",
    short: "Academic paths, interviews, stress, and self-leadership.",
    website: "https://www.youthcompass.ch",
    bio: [
      "Shahnaz is a certified Youth Well-being & Career Coach, accredited by the International Coaching Federation (ICF) programs and the Center for Credentialing and Education. She specializes in guiding teens and young adults toward academic, career, and personal development. Shahnaz is passionate about empowering the next generation to grow, find their voice, and create meaningful paths aligned with their strengths, values, and passions.",
      "She is particularly interested in supporting young people in exploring career paths and university programs, setting clear goals, and preparing compelling applications and interviews. She helps young people build essential life skills like self-leadership, stress management, and communication while navigating transitions and creating sustainable balance between studies, work, and personal life. Shahnaz believes every young person has unique potential. Her mission is to guide them in discovering who they are, what inspires them, and how they can create a fulfilling and impactful future. In addition to working with Coach Me 2, Shahnaz is the founder of her own coaching business.",
    ],
  },
  {
    name: "Elan B.",
    role: "ICF ACC · Emotional Intelligence",
    photo: "/photos/elan-b.jpg",
    short: "Names limiting beliefs. Builds plans with real accountability.",
    bio: [
      "Elan is passionate about supporting young people reaching their potential and building resilience as they navigate their journey. She has a 30-year background in secondary teaching as well as several years’ experience coaching emotional intelligence and goal-setting strategies for young adults ages 14-18. She received her Board Certification from the National Center for Credentialing and Associate Certified Coach qualification for coaches offered by the International Coaching Federation.",
      "Elan has worked with diverse young adults to identify limiting beliefs, clarify life goals, and create actionable plans for success. Through a combination of empathetic listening, motivational sessions, and accountability frameworks, she has helped young people improve their confidence, tap into their strengths, and overall well-being. Her approach integrates evidence-based youth coaching techniques with a compassionate, client-centered mindset that fosters trust and transformation. She has guided young adults through major life transitions, achieving measurable outcomes such as improved work-life balance, enhanced leadership skills, and increased self-awareness.",
    ],
  },
  {
    name: "Tanya M.",
    role: "Positive Psychology · ICF",
    photo: "/photos/tanya-m.jpg",
    short: "Self-worth, resilience, and communication — for teens and moms.",
    bio: [
      "Tanya has lived in 10 different countries and travelled to many more. During her twenties, Tanya backpacked around the world for seven years, taking on a variety of jobs that immersed her in different cultures and experiences. From au pairing to picking grapes, to packing potatoes, to working in 5-star hotels. She even sailed from Australia to Thailand as crew. These diverse experiences allowed Tanya to meet people from all walks of life, gifting her with understanding, empathy, and a real desire to make a difference.",
      "Today, Tanya channels her compassion into her work as a positive psychology coach for tweens, teens, and their moms. This age group is very close to Tanya’s heart after her own challenging adolescence and as a mother of two children in this phase of life. She focuses on nurturing self-worth, resilience, connection, and effective communication, empowering young people to flourish.",
      "Tanya has a degree in Nutrition, is a certified Positive Psychology Practitioner, a certified and ICF credentialed coach, and a teacher of mindfulness for children and teens. Tanya has worked in primary and secondary schools in New Zealand, Mauritius and currently in the UK as a Student Support Lead in a secondary school.",
    ],
  },
  {
    name: "Ellysia G.",
    role: "Youth Resilience Coach",
    photo: "/photos/ellysia-g.jpg",
    short: "Dating, social media, uni, careers — the stuff nobody prepares you for.",
    bio: [
      "Ellysia coaches teens and young adults through the stuff no one really prepares them for: relationships, dating, social media pressure, stress, school, university applications, careers, and that overwhelming feeling either too much is going on or not enough is.",
      "Ellysia is a certified Youth Resilience Coach and Youth Well-being Coach from the Youth Coaching Institute. Yet, Ellysia doesn’t coach from theory or assumptions, she coaches from lived experience. As Ellysia says, “I’ve been through the confusion, bad decisions, burnout, overthinking, uni, jobs, you name it. I get how life actually feels right now.”",
      "Ellysia is here to listen first. No judgment. No fake motivation. Just real conversations, honest guidance, and support from someone who’s a few steps ahead (simply because of her age). Ellysia is willing to tell the truth and help you get your shit together in a way that actually works for you. In addition to coaching with CoachMe2.world, Ellysia can be found growing her own business at youthmentorhub.com.",
    ],
  },
  {
    name: "Sarah Rose S.",
    role: "Coach",
    photo: "/photos/sarah-rose-s.jpg",
    short: "Full bio coming soon.",
    bio: ["Bio coming soon."],
  },
  {
    name: "Misty H.",
    role: "Youth Resilience Coach",
    photo: "/photos/misty-h.png",
    short: "Collaborative, not preachy — 25+ years with students.",
    bio: [
      "Do you feel overwhelmed with everything that’s going on in your life: relationships, school or work, finances, health, the future? It’s a lot! Sometimes, you just need a space to work through it with someone, to know you’re not alone.",
      "Misty helps teens and young adults figure out what’s actually important to them, and chart their own path forward. Misty has over 25 years of experience in tutoring and academic coaching. She is a certified Youth Resilience Coach and Youth Well-being Coach from the Youth Coaching Institute.",
      "Misty says “Coaching is a collaborative process. I’m here to listen and help you find the answers that feel right for you.”",
    ],
  },
  {
    name: "Ayesha S.",
    role: "Well-Being & Youth Resilience",
    photo: "/photos/ayesha-s.jpg",
    short: "Self-trust as the foundation for confidence and calm.",
    website: "https://www.peacewarriorscoaching.com",
    bio: [
      "Ayesha is dedicated to helping teens build self-trust, confidence, and calm from the inside out.",
      "She is a certified Well-Being and Youth Resilience Coach through the Youth Coaching Institute and brings over 21 years of experience teaching middle school. She has also served as an International Baccalaureate Coordinator, supporting students in growing not just academically, but as thoughtful, reflective, and confident individuals through intentional skill-building.",
      "Ayesha’s coaching centers on one powerful idea: self-trust is the foundation for everything. When teens learn to trust themselves, they build real confidence, develop resilience, and create a sense of calm that stays with them through life’s ups and downs.",
      "Ayesha is also the founder of Peace Warriors Coaching, a space designed to help young people become “peace warriors” in their own lives—learning how to stay grounded, handle challenges, and respond to life with inner strength instead of outside forces.",
    ],
  },
  {
    name: "Heidi H.",
    role: "Wellness, Health & Resilience",
    photo: "/photos/heidi-h.jpg",
    short: "Action-based goals, mental fitness, and restorative practice.",
    website: "https://www.circlecoaching.org",
    bio: [
      "Heidi is a certified Wellness, Health and Resilience Youth Coach and holds a Masters in Public Affairs from The Humphrey School at the University of Minnesota and Restorative Practice Skills from The University of Minnesota School of Social Work. For the last 18 years, she has held various positions working in education, coaching, advocacy and restorative practices with adults and teenagers. She is a trained mediator, skilled in ACES (Adverse Childhood Experience Study), “It’s That Easy” curriculum, and as a restorative practitioner.",
      "Heidi is the owner of Circle Coaching and she is also the Creator and Host of the Podcast “Parent Town.”",
      "“I am invested in helping young people and working alongside them using evidence-based approaches that highlight their own individual strengths. Action-based goals that are long-lasting are our targets, and moving into a space for mental fitness and growth is always the intention. I also partner with parents to coach them through their challenges.”",
    ],
  },
  {
    name: "Orly D.",
    role: "I-O Psychologist · Life Coach",
    photo: "/photos/orly-d.jpg",
    short: "Self-awareness, new habits, and a life that feels like yours.",
    bio: [
      "Orly is an Industrial-Organizational psychologist and a certified life coach with experience in industry, academia, educational and community-based settings. The underlying assumptions for her work are that people of all ages have the ability to create a meaningful life, and also that growth can only occur outside of one’s comfort zone. To support that, Orly helps create a non-judgemental, friendly space and a clear structure to move through this development process. As clients work on achieving meaningful goals, they will build self-awareness, learn and practice new habits and skills, and feel more engaged and in control of their life.",
    ],
  },
  {
    name: "Karen M.",
    role: "Fulfillment Institute Graduate Coach",
    short: "Stability, recovery, and personal growth — with compassion and practical guidance.",
    bio: [
      "Karen is a dedicated professional committed to helping individuals build stability, recovery, and personal growth. She serves as a Housing Navigator with Hope the Mission, a Peer Recovery Support Specialist with Tarzana Treatment Centers, a Community Health Worker with Christ Centered Ministries, and a Teaching Assistant with CROP Organization.",
      "As a The Fulfillment Institute graduate coach, Karen supports individuals in strengthening their mindset, building confidence, developing healthy habits, and creating meaningful goals.",
      "Drawing on her journey of transformation, reentry, and seven years of sobriety, Karen connects with others through compassion, encouragement, and practical guidance. She believes everyone deserves the opportunity to rebuild, grow, and create a better future. Outside of work, she enjoys time with her son, Angel, and her dogs, Peggy and Charly.",
    ],
  },
  { name: "Rohan S.", role: "Coach", short: "Full bio coming soon.", bio: ["Bio coming soon!"] },
  { name: "Simi Y.", role: "Coach", short: "Full bio coming soon.", bio: ["Bio coming soon!"] },
  { name: "Johnny H.", role: "Coach", short: "Full bio coming soon.", bio: ["Bio coming soon!"] },
];

export const BOARD: Person[] = [
  {
    name: "Rebecca D. Oertell",
    role: "Founder, Coach, Board Member",
    photo: "/photos/rebecca-oertell.jpg",
    short: "Founder, coach, and board member — always chasing how people thrive.",
    bio: [
      "J.D. Emory Law. B.A. Psychology & Interdisciplinary Communications, Vanderbilt (magna cum laude). NBC-HWC, Wellcoaches, AVI Consultant, Lifestyle Medicine Coach, Cognitive Behavioral Coach, Youth Coaching Institute. Associate Member, Institute of Coaching. Career spanning estate planning, human capital advising, and next-gen mentoring — always chasing how people actually thrive.",
    ],
  },
  {
    name: "Dr. Jennifer Zumarraga",
    role: "Board Member",
    photo: "/photos/jen-board.jpg",
    short: "Child & adolescent psychiatrist. Co-founder of The Healthy Teen Project.",
    bio: [
      "Board certified in General Psychiatry and Child & Adolescent Psychiatry. NIMH research, University of Rochester and USC training. Former Medical Director of ASPIRE at El Camino Hospital. Co-founder of The Healthy Teen Project. APA and AACAP member.",
    ],
  },
  {
    name: "Michelle C. Lewis",
    role: "Board Member",
    photo: "/photos/michelle-board.png",
    short: "Inclusive talent leadership at KPMG — and on our board.",
    bio: [
      "Associate Director, Talent Acquisition Solutions at KPMG LLP. Leads national TA Diversity, Equity & Inclusion and the KPMG Embark Scholars internship. B.S. Criminal Justice, Tennessee State. M.S. Management (Strategy & Leadership), Michigan State.",
    ],
  },
];

export const INTERNS: Person[] = [
  {
    name: "Nini N.",
    role: "Full-time Intern · Strategy & Partnerships",
    place: "Based in Switzerland",
    photo: "/photos/nini-n.jpeg",
    short: "International marketing, brand, and our five-year plan — from Switzerland.",
    bio: [
      "Graduate of the International School of Central Switzerland. Full-time intern helping CoachMe2 build its five-year plan. Nini leads international marketing, brand growth, and community partnerships.",
    ],
  },
  {
    name: "Sudhith M.",
    role: "Software Development Intern",
    place: "South Forsyth High School",
    photo: "/photos/sudhith-m.jpg",
    short: "Leads the CoachMe2 website. CS, AI, and tools for families.",
    bio: [
      "Senior at South Forsyth High School with interests in computer science, AI, and software development. Leads development of CoachMe2’s website and helps build digital tools that support students and families.",
    ],
  },
  {
    name: "Arshia B.",
    role: "Tech Intern",
    place: "South Forsyth High School",
    photo: "/photos/arshia-b.jpg",
    short: "Tech intern building digital tools students and families actually use.",
    bio: [
      "Senior at South Forsyth High School with a strong interest in computer science. Tech intern at CoachMe2 who loves the work — helping build digital tools that support students and families.",
    ],
  },
  {
    name: "Hasi T.",
    role: "Social Media & Marketing Intern",
    place: "Fulton Science Academy",
    photo: "/photos/hasi-t.jpg",
    short: "Varsity basketball captain using coaching to support teen mental health.",
    bio: [
      "Student at Fulton Science Academy. Varsity basketball captain. Using coaching fundamentals to support teen mental health — and taking on new challenges while she's at it.",
    ],
  },
  {
    name: "Miraya D.",
    role: "Social Media & Marketing Intern",
    place: "Fulton Science Academy",
    photo: "/photos/miraya-d.png",
    short: "Business, then law. Believes nobody should face hard things alone.",
    bio: [
      "Sophomore at Fulton Science Academy. Planning a path through business, then law. At CoachMe2 because nobody should face hard things alone.",
    ],
  },
  {
    name: "Irene C.",
    role: "Curriculum Development Intern",
    place: "University of Virginia",
    photo: "/photos/irene-c.jpg",
    short: "CS + Psychology at UVA. Inclusive curriculum for the next leaders.",
    bio: [
      "Rising senior at the University of Virginia studying Computer Science and Psychology. Building inclusive curriculum for the next generation of leaders.",
    ],
  },
  {
    name: "Dora Y.",
    role: "Research Intern",
    place: "Fulton Science Academy",
    photo: "/photos/dora-y.jpg",
    short: "Future in medicine. Coaching as a way to build resilience.",
    bio: [
      "Sophomore at Fulton Science Academy with a future in medicine. Sees coaching as a sustainable way to build resilience.",
    ],
  },
  {
    name: "Abhiram K.",
    role: "Research Intern",
    photo: "/photos/abhiram-k.png",
    short: "Sports medicine, leadership, and learning from mistakes on purpose.",
    bio: [
      "High school student aiming for medicine. Athletic training, sports medicine, leadership, and learning from mistakes on purpose.",
    ],
  },
  {
    name: "Jahnavi V.",
    role: "Social Media, Marketing & Podcast Intern",
    photo: "/photos/jahnavi-v.png",
    short: "Personal growth, mental wellness, and helping others invest in themselves.",
    bio: [
      "Sophomore interested in medicine. Personal growth, mental wellness, and helping others invest in themselves — including through social, marketing, and podcast work.",
    ],
  },
  {
    name: "Sanjay S.",
    role: "Research Intern",
    place: "Fulton Science Academy",
    photo: "/photos/sanjay-s.png",
    short: "Aeronautical engineering ambitions. Highlights teen mental health.",
    bio: [
      "Fulton Science Academy. Aeronautical engineering ambitions. Innovation, growth, and highlighting teen mental health.",
    ],
  },
  { name: "Nadika", role: "Intern", short: "Intern with CoachMe2.", bio: ["Full bio coming soon."] },
];

export const INNOVATORS: Person[] = [
  {
    name: "Robyn J.",
    role: "Curriculum Development",
    photo: "/photos/robyn-j.jpg",
    short: "Designing CoachMe2 initiatives and partnerships for teen well-being.",
    bio: [
      "ICF Professional Certified Coach designing CoachMe2 initiatives and partnerships with organizations that support teen well-being.",
    ],
  },
  {
    name: "Cherry U.",
    role: "Board of Advisors",
    photo: "/photos/cherry-u.jpg",
    short: "FSA alum. UC Berkeley 2026. With CoachMe2 since day one.",
    bio: [
      "Fulton Science Academy alum heading to UC Berkeley in 2026. Law-bound. With CoachMe2 since day one — and would recommend coaching to anyone who wants to get better.",
    ],
  },
  {
    name: "Sahasra S.",
    role: "Board of Advisors",
    photo: "/photos/sahasra-s.png",
    short: "Advisor with CoachMe2.",
    bio: ["Full bio coming soon — Sahasra serves on CoachMe2’s board of advisors."],
  },
];

export const CRISIS_LINES = [
  {
    tag: "Call or text 988",
    title: "988 Suicide & Crisis Lifeline",
    body: "Free, confidential support in the U.S. 24/7. You do not have to be in crisis to reach out.",
    href: "https://988lifeline.org/",
  },
  {
    tag: "Text HOME to 741741",
    title: "Crisis Text Line",
    body: "A trained volunteer texts back. Available in the U.S., UK, Canada, and Ireland.",
    href: "https://www.crisistextline.org/",
  },
  {
    tag: "Anywhere in the world",
    title: "Find a helpline",
    body: "IASP’s directory of local suicide-prevention and emotional-support lines.",
    href: "https://www.iasp.info/suicidalthoughts/",
  },
  {
    tag: "LGBTQ+ youth",
    title: "The Trevor Project",
    body: "24/7 call, text, and chat for LGBTQ young people. You are not alone in this.",
    href: "https://www.thetrevorproject.org/get-help/",
  },
];

export type Resource = { category: "CoachMe2" | "Mind & mood" | "School & college" | "Life & future"; title: string; body: string; href: string; cta: string };

export const RESOURCES: Resource[] = [
  { category: "CoachMe2", title: "Book a discovery call", body: "Twenty minutes with Rebecca. Thoughtful, unhurried, and entirely about what you need.", href: LINKS.discoveryCall, cta: "Schedule" },
  { category: "CoachMe2", title: "Client portal", body: "Already coaching with us? Sign in for sessions, chat with your coach, goals, and forms.", href: "/login", cta: "Sign in" },
  { category: "CoachMe2", title: "Decision-making series", body: "Majors, extracurriculars, asking someone out — practice choosing with your own judgment.", href: "/decision-making", cta: "Coming soon" },
  { category: "CoachMe2", title: "Keep coaching affordable", body: "Coach Me 2, Inc. is a 501(c)(3). 100% of gifts through Zeffy go to the work.", href: "/donate", cta: "Donate" },
  { category: "CoachMe2", title: "Intern or volunteer", body: "Students already help build this. Curriculum, research, digital tools, stories.", href: "/volunteer", cta: "Get involved" },
  { category: "CoachMe2", title: "Newsletter", body: "Program dates, webinars, and what’s next — including EvolvED invites.", href: LINKS.newsletter, cta: "Sign up" },
  { category: "Mind & mood", title: "The Jed Foundation", body: "Guides for emotional health, suicide prevention, and the transition to adulthood.", href: "https://jedfoundation.org/", cta: "Open" },
  { category: "Mind & mood", title: "Child Mind Institute — for teens", body: "Clear articles on anxiety, ADHD, depression, school stress, and getting help.", href: "https://childmind.org/audience/for-teens/", cta: "Open" },
  { category: "Mind & mood", title: "NAMI — teens & young adults", body: "National Alliance on Mental Illness. Education, community, and a helpline.", href: "https://www.nami.org/your-journey/kids-teens-and-young-adults/teens/", cta: "Open" },
  { category: "Mind & mood", title: "Mental Health America screening", body: "Anonymous, scientifically validated screens. A starting point — not a diagnosis.", href: "https://screening.mhanational.org/screening-tools/", cta: "Open" },
  { category: "Mind & mood", title: "Active Minds", body: "Student-powered mental health advocacy. Find a chapter, a story, a next step.", href: "https://www.activeminds.org/", cta: "Open" },
  { category: "Mind & mood", title: "Teen Line", body: "Teens helping teens. Call 800-852-8336, 6–10 p.m. PT, or message online.", href: "https://www.teenline.org/", cta: "Open" },
  { category: "Mind & mood", title: "NIMH — teen depression", body: "What it looks like, when to get help, and how treatment actually works.", href: "https://www.nimh.nih.gov/health/publications/teen-depression", cta: "Open" },
  { category: "School & college", title: "Common App", body: "One application for 1,000+ colleges. Start early. Save often. You can do this.", href: "https://www.commonapp.org/", cta: "Open" },
  { category: "School & college", title: "FAFSA", body: "Federal student aid. Free to file. Deadlines matter more than you think.", href: "https://studentaid.gov/h/apply-for-aid/fafsa", cta: "Open" },
  { category: "School & college", title: "BigFuture", body: "College Board’s planner: explore majors, compare schools, find scholarships.", href: "https://bigfuture.collegeboard.org/", cta: "Open" },
  { category: "School & college", title: "Khan Academy", body: "Free SAT practice, AP, math, science, and the stuff school rushed past.", href: "https://www.khanacademy.org/", cta: "Open" },
  { category: "School & college", title: "Coalition for College", body: "Another application path, built for access. Locker for essays and files.", href: "https://www.coalitionforcollegeaccess.org/", cta: "Open" },
  { category: "School & college", title: "Federal Student Aid", body: "Grants, loans, work-study — plain-language explanations of how college gets paid.", href: "https://studentaid.gov/", cta: "Open" },
  { category: "Life & future", title: "Sleep Foundation — teens", body: "Why 8–10 hours isn’t optional, and how to steal some back from the scroll.", href: "https://www.sleepfoundation.org/teens-and-sleep", cta: "Open" },
  { category: "Life & future", title: "CDC Adolescent & School Health", body: "Trusted public-health guidance on mental health, substances, and staying well.", href: "https://www.cdc.gov/healthy-youth/index.html", cta: "Open" },
  { category: "Life & future", title: "My Next Move", body: "U.S. Department of Labor career explorer. Interests in, real jobs out.", href: "https://www.mynextmove.org/", cta: "Open" },
  { category: "Life & future", title: "Occupational Outlook Handbook", body: "Pay, growth, education — the BLS catalog of what work actually looks like.", href: "https://www.bls.gov/ooh/", cta: "Open" },
  { category: "Life & future", title: "StopBullying.gov", body: "What to do if you are being bullied, seeing it, or not sure it “counts.”", href: "https://www.stopbullying.gov/", cta: "Open" },
  { category: "Life & future", title: "GLSEN", body: "Safe schools for LGBTQ+ students. Resources, GSAs, and how to push for better.", href: "https://www.glsen.org/", cta: "Open" },
];

export const IKIGAI_COMPASS = [
  { name: "Joy", body: "Energy, curiosity, connection, enjoyment" },
  { name: "Meaning", body: "Values, relationships, ideas that matter" },
  { name: "Strengths", body: "What’s strong — and what you want to grow" },
  { name: "Belonging", body: "Where you feel known and able to contribute" },
  { name: "Contribution", body: "Who or what you care enough to support" },
  { name: "Possibility", body: "Majors, careers, paths worth exploring" },
];

export const EVOLVED_PILLARS = [
  { name: "Lead yourself", body: "Values, strengths, who you want to become." },
  { name: "Stay curious", body: "Challenge assumptions. Treat setbacks as data." },
  { name: "Vision → action", body: "Goals and habits without shame-fuel." },
  { name: "Perform & recover", body: "Stress, rest, boundaries, sustainable drive." },
  { name: "Relational IQ", body: "Listen, trust, belonging, better rooms." },
  { name: "Courageous voice", body: "Disagreement, feedback, advocating for you and others." },
];
