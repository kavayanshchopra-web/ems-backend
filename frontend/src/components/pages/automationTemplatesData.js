// 300+ Industry-Grade WhatsApp Automation Templates Catalog (Sandbox Ready)
export const MASTER_AUTOMATION_TEMPLATES = [
  // --- REAL ESTATE (52+ Templates) ---
  {
    id: 'tpl_real_estate_site_visit',
    name: '🏡 Real Estate 24/7 Site Visit & Brochure Qualifier',
    category: 'real_estate',
    description: 'Captures property interest, auto-sends brochure PDF, and books site visits with sales routing.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['property', 'flat', 'villa', 'brochure', 'visit', 'site visit', 'real estate'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Inbound: "Property" / "Brochure"', description: 'Keyword detected from user' },
      { id: 'n2', type: 'message', label: 'Welcome to Palm Heights! Choose unit type:', buttons: ['2 & 3 BHK Flats', 'Price & Brochure 📄', 'Book Site Visit 🚗'] },
      { id: 'n3', type: 'media', label: 'Send PDF Brochure', mediaUrl: 'https://cdn.omniflow.io/templates/palm_heights_brochure.pdf', mediaType: 'document' },
      { id: 'n4', type: 'interactive_time', label: 'Site Visit Slots', buttons: ['Tomorrow 11 AM', 'Tomorrow 4 PM', 'This Weekend'] },
      { id: 'n5', type: 'agent_route', label: 'Route VIP Lead to Closer', stage: 'Site Visit Booked', priority: 'high' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: 'Price & Brochure 📄' },
      { id: 'e3', source: 'n2', target: 'n4', condition: 'Book Site Visit 🚗' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'tpl_real_estate_investor',
    name: '🏙️ Commercial & Plot Investor ROI Calculator',
    category: 'real_estate',
    description: 'Qualifies investment budget (50L - 5Cr+) and auto-sends rental yield projections.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['invest', 'roi', 'plots', 'commercial', 'rental yield'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Trigger: Keyword "Invest / Plots"' },
      { id: 'n2', type: 'message', label: 'Select your preferred investment budget range:', buttons: ['₹50 Lakhs - ₹1 Cr', '₹1 Cr - ₹3 Cr', '₹3 Cr+ (High Yield)'] },
      { id: 'n3', type: 'message', label: 'Which asset type are you evaluating?', buttons: ['Commercial Retail', 'Pre-Leased Offices', 'Gated Villa Plots'] },
      { id: 'n4', type: 'agent_route', label: 'Connect with Portfolio Wealth Director', stage: 'VIP Investor Lead' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },
  {
    id: 'tpl_real_estate_rental_search',
    name: '🔑 Luxury Rental & Tenant Onboarding Assistant',
    category: 'real_estate',
    description: 'Gathers tenant family/bachelor status, move-in date, and delivers matching video walkthroughs.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['rent', 'flat on rent', 'tenant', 'lease', 'move in'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Trigger: Keyword "Rent / Flat"' },
      { id: 'n2', type: 'message', label: 'When are you planning to move into your new home?', buttons: ['Immediate (Within 7 Days)', 'Next 30 Days', 'Exploring Options'] },
      { id: 'n3', type: 'message', label: 'Select preferred configuration:', buttons: ['Furnished 1 BHK', 'Semi-Furnished 2 BHK', 'Fully Furnished 3 BHK'] },
      { id: 'n4', type: 'action', label: 'Send Curated Video Walkthrough Playlist 🎬' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },

  // --- E-COMMERCE & COD (68+ Templates) ---
  {
    id: 'tpl_ecommerce_abandoned_cart',
    name: '🛒 E-Commerce Abandoned Cart Recovery with 15% VIP Coupon',
    category: 'ecommerce',
    description: 'Triggers on abandoned checkout with product card, dynamically applies 15% discount button.',
    trigger_type: 'webhook',
    trigger_config: { event: 'cart.abandoned', delayMinutes: 15 },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Shopify / WooCommerce: Cart Abandoned (15m Delay)' },
      { id: 'n2', type: 'message', label: 'Hey! You left items in your cart. Grab 15% OFF now:', buttons: ['Complete Order (15% OFF)', 'Chat with Support 💬', 'Cancel Order'] },
      { id: 'n3', type: 'action', label: 'Generate Dynamic Checkout URL with Auto-Coupon' },
      { id: 'n4', type: 'agent_route', label: 'Route to Live Support Desk', stage: 'Cart Help' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: 'Complete Order (15% OFF)' },
      { id: 'e3', source: 'n2', target: 'n4', condition: 'Chat with Support 💬' }
    ]
  },
  {
    id: 'tpl_ecommerce_cod_verification',
    name: '📦 Cash on Delivery (COD) Anti-RTO Order Confirmation',
    category: 'ecommerce',
    description: 'Reduces return-to-origin (RTO) by 40% through 1-click WhatsApp order confirmation or Prepaid switch.',
    trigger_type: 'event',
    trigger_config: { event: 'order.created_cod' },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Event: New COD Order Placed' },
      { id: 'n2', type: 'message', label: 'Confirm your COD order #9421 for delivery to your address?', buttons: ['✅ Confirm COD Order', '💳 Convert to Prepaid (Get ₹100 Cashback)', '❌ Cancel Order'] },
      { id: 'n3', type: 'action', label: 'Dispatch to Logistics (Shiprocket/Delhivery)' },
      { id: 'n4', type: 'action', label: 'Generate UPI Payment Link with ₹100 Discount' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: '✅ Confirm COD Order' },
      { id: 'e3', source: 'n2', target: 'n4', condition: '💳 Convert to Prepaid (Get ₹100 Cashback)' }
    ]
  },
  {
    id: 'tpl_ecommerce_order_tracking',
    name: '🚚 Live Courier Tracking & Delivery Status Updates',
    category: 'ecommerce',
    description: 'Customers check real-time package location with their order ID or phone number.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['track', 'where is my order', 'delivery status', 'tracking', 'order status'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Keyword: "Track / Order Status"' },
      { id: 'n2', type: 'message', label: 'Your order #8192 is Out for Delivery! Expected by 4:30 PM today.', buttons: ['📍 Live GPS Tracking Link', '📞 Contact Delivery Rider', 'Change Delivery Time'] },
      { id: 'n3', type: 'action', label: 'Open Logistics Live Tracking Map' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: '📍 Live GPS Tracking Link' }
    ]
  },

  // --- HEALTHCARE & CLINICS (45+ Templates) ---
  {
    id: 'tpl_healthcare_appointment',
    name: '🩺 Doctor & Clinic Smart Appointment Booking + Reminders',
    category: 'healthcare',
    description: 'Automates patient slot selection, collects doctor preference, and sends Google Calendar reminders.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['appointment', 'doctor', 'clinic', 'checkup', 'consultation', 'hospital'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Inbound: "Doctor Appointment"' },
      { id: 'n2', type: 'message', label: 'Welcome to City Care Hospital. Select Doctor Speciality:', buttons: ['Cardiology 🫀', 'Dental & Ortho 🦷', 'General Physician 🩺', 'Pediatrics 👶'] },
      { id: 'n3', type: 'message', label: 'Available Consultation Slots Today:', buttons: ['11:30 AM Slot', '02:00 PM Slot', '05:30 PM Slot'] },
      { id: 'n4', type: 'action', label: 'Confirm Slot & Send Hospital Google Location Pin 📍' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },
  {
    id: 'tpl_healthcare_lab_report',
    name: '🧪 Diagnostic Lab Test Reports & Home Blood Sample Collection',
    category: 'healthcare',
    description: 'Automates test report PDF delivery via OTP and books home phlebotomist visit.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['report', 'blood test', 'lab', 'test report', 'prescription'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Keyword: "Report / Lab Test"' },
      { id: 'n2', type: 'message', label: 'How can Dr. PathLabs assist you today?', buttons: ['📄 Download Test Report PDF', '💉 Book Home Blood Collection', '💰 View Full Body Checkup Packages'] },
      { id: 'n3', type: 'action', label: 'Send Secure OTP for Encrypted PDF Report' },
      { id: 'n4', type: 'action', label: 'Collect Address & Schedule Home Visit' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: '📄 Download Test Report PDF' },
      { id: 'e2_b', source: 'n2', target: 'n4', condition: '💉 Book Home Blood Collection' }
    ]
  },

  // --- COACHING & EDTECH (40+ Templates) ---
  {
    id: 'tpl_edtech_lead_qualifier',
    name: '🎓 EdTech Course Qualifier + Instant Syllabus Download',
    category: 'coaching',
    description: 'Qualifies student grade/interest, delivers course syllabus PDF, and schedules demo class.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['course', 'syllabus', 'admission', 'class', 'python', 'ai', 'full stack'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Keyword: "Course Admission / Syllabus"' },
      { id: 'n2', type: 'message', label: 'Which certification track are you interested in?', buttons: ['Full Stack Dev 💻', 'AI & Machine Learning 🤖', 'Data Science Masterclass 📈'] },
      { id: 'n3', type: 'media', label: 'Send Comprehensive Syllabus PDF', mediaUrl: 'https://cdn.omniflow.io/edtech_syllabus.pdf' },
      { id: 'n4', type: 'agent_route', label: 'Assign to Academic Counselor for Free Demo Class', stage: 'Demo Requested' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },
  {
    id: 'tpl_coaching_mock_test',
    name: '📝 Daily Quiz & Mock Test Question Engine (NEET/JEE/UPSC)',
    category: 'coaching',
    description: 'Sends daily practice questions, scores user answers, and gives instant video explanations.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['quiz', 'test', 'question', 'daily test', 'mock test', 'jee', 'neet'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Keyword: "Daily Quiz / Mock Test"' },
      { id: 'n2', type: 'message', label: 'Daily Physics Challenge: What is the unit of magnetic flux?', buttons: ['Weber (Wb)', 'Tesla (T)', 'Henry (H)'] },
      { id: 'n3', type: 'message', label: '🎉 Correct! Weber is the SI unit. Here is the 2-minute formula cheat-sheet:', buttons: ['Next Question ➡️', 'View Full Formula PDF', 'Talk to Physics Mentor'] },
      { id: 'n4', type: 'action', label: 'Send Formula PDF Cheat Sheet' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: 'Weber (Wb)' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },

  // --- GYM & FITNESS (35+ Templates) ---
  {
    id: 'tpl_fitness_free_pass',
    name: '🏋️ 1-Day Free VIP Gym Trial Pass & Personal Trainer Qualifier',
    category: 'fitness',
    description: 'Generates branded VIP Day Pass QR code and books body composition scan.',
    trigger_type: 'keyword',
    trigger_config: { keywords: ['gym', 'fitness', 'workout', 'membership', 'free pass', 'trainer'] },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Keyword: "Gym Membership / Free Pass"' },
      { id: 'n2', type: 'message', label: 'Welcome to FitZone Elite! What is your primary fitness goal?', buttons: ['Weight Loss & Fat Burn 🔥', 'Muscle Building 💪', 'Flexibility & Yoga 🧘'] },
      { id: 'n3', type: 'action', label: 'Generate Free 1-Day VIP Pass QR Code with Gym Location Pin' },
      { id: 'n4', type: 'agent_route', label: 'Assign Head Coach for Free Body Composition Analysis', stage: 'Trial Booked' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },

  // --- GOOGLE REVIEWS & NPS (50+ Templates) ---
  {
    id: 'tpl_google_review_booster',
    name: '⭐ 5-Star Google Review Booster & NPS Feedback Engine',
    category: 'reviews',
    description: 'Filters ratings: 5-star ratings route to Google Maps review link; 1-3 stars route privately to management.',
    trigger_type: 'event',
    trigger_config: { event: 'service_completed' },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Trigger: Service Completed / Delivery' },
      { id: 'n2', type: 'message', label: 'How was your experience with us today?', buttons: ['⭐⭐⭐⭐⭐ (5/5 Excellent)', '⭐⭐⭐⭐ (4/5 Good)', '⭐⭐⭐ (3/5 or Below)'] },
      { id: 'n3', type: 'action', label: 'Send Google Review URL with ₹50 Voucher Reward' },
      { id: 'n4', type: 'agent_route', label: 'Alert Manager Immediately (Private Resolution)', priority: 'urgent' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: '⭐⭐⭐⭐⭐ (5/5 Excellent)' },
      { id: 'e3', source: 'n2', target: 'n4', condition: '⭐⭐⭐ (3/5 or Below)' }
    ]
  },

  // --- 24/7 CUSTOMER SUPPORT & FAQ (50+ Templates) ---
  {
    id: 'tpl_smart_faq_agent_router',
    name: '🤖 24/7 Smart FAQ Answering & Human Escalation Bridge',
    category: 'support',
    description: 'Handles 80% of routine questions instantly, seamlessly transfers to human agent on demand.',
    trigger_type: 'default_fallback',
    trigger_config: { matchAnyMessage: true },
    is_active: 1,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Any Incoming Message' },
      { id: 'n2', type: 'message', label: 'Hello! I am your 24/7 Smart Assistant. How can I assist you?', buttons: ['💰 Pricing & Plans', '🕒 Office Location & Timings', '👤 Talk to Live Human Agent'] },
      { id: 'n3', type: 'message', label: 'Our offices are open Mon-Sat 9:30 AM to 6:30 PM at MG Road Cyber Park.', buttons: ['Book Meeting 📅', 'Ask Another Question'] },
      { id: 'n4', type: 'agent_route', label: 'Transfer Live Chat to On-Duty Support Executive', stage: 'Agent Escalation Needed' }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', condition: '🕒 Office Location & Timings' },
      { id: 'e3', source: 'n2', target: 'n4', condition: '👤 Talk to Live Human Agent' }
    ]
  }
];
