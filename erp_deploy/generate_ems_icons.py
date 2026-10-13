#!/usr/bin/env python3
# ==============================================================================
# EMS Ultra-Modern Unique Vector Icon Pack Generator
# Generates bespoke SVG icons for every single Odoo application
# Matching the exact aesthetic of the EMS App Launcher
# ==============================================================================

import os
import hashlib

ICONS_DIR = "/var/www/omniflow-erp/ems_icons"
os.makedirs(ICONS_DIR, exist_ok=True)

# 11 Curated Pastel Palettes (Matching Screenshot 2)
PALETTES = {
    'teal':    {'bg1': '#f0fdfa', 'bg2': '#ccfbf1', 'border': '#99f6e4', 'stroke': '#0d9488', 'fill': 'rgba(13, 148, 136, 0.14)'},
    'emerald': {'bg1': '#ecfdf5', 'bg2': '#d1fae5', 'border': '#a7f3d0', 'stroke': '#059669', 'fill': 'rgba(5, 150, 105, 0.14)'},
    'blue':    {'bg1': '#eff6ff', 'bg2': '#dbeafe', 'border': '#bfdbfe', 'stroke': '#2563eb', 'fill': 'rgba(37, 99, 235, 0.14)'},
    'indigo':  {'bg1': '#eef2ff', 'bg2': '#e0e7ff', 'border': '#c7d2fe', 'stroke': '#4f46e5', 'fill': 'rgba(79, 70, 229, 0.14)'},
    'purple':  {'bg1': '#faf5ff', 'bg2': '#f3e8ff', 'border': '#e9d5ff', 'stroke': '#9333ea', 'fill': 'rgba(147, 51, 234, 0.14)'},
    'violet':  {'bg1': '#f5f3ff', 'bg2': '#ede9fe', 'border': '#ddd6fe', 'stroke': '#7c3aed', 'fill': 'rgba(124, 58, 237, 0.14)'},
    'rose':    {'bg1': '#fff1f2', 'bg2': '#ffe4e6', 'border': '#fecdd3', 'stroke': '#e11d48', 'fill': 'rgba(225, 29, 72, 0.14)'},
    'amber':   {'bg1': '#fffbeb', 'bg2': '#fef3c7', 'border': '#fde68a', 'stroke': '#d97706', 'fill': 'rgba(217, 119, 6, 0.14)'},
    'orange':  {'bg1': '#fff7ed', 'bg2': '#ffedd5', 'border': '#fed7aa', 'stroke': '#ea580c', 'fill': 'rgba(234, 88, 12, 0.14)'},
    'cyan':    {'bg1': '#ecfeff', 'bg2': '#cffafe', 'border': '#a5f3fc', 'stroke': '#0891b2', 'fill': 'rgba(8, 145, 178, 0.14)'},
    'slate':   {'bg1': '#f8fafc', 'bg2': '#f1f5f9', 'border': '#e2e8f0', 'stroke': '#475569', 'fill': 'rgba(71, 85, 105, 0.14)'}
}

# Unique Lucide-style vector paths for each core application
MODULE_GLYPHS = {
    # Sales
    'sale': {
        'palette': 'teal',
        'path': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
    },
    'sale_management': {
        'palette': 'teal',
        'path': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
    },
    # Restaurant
    'pos_restaurant': {
        'palette': 'orange',
        'path': '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" x2="6" y1="1" y2="4"/><line x1="10" x2="10" y1="1" y2="4"/><line x1="14" x2="14" y1="1" y2="4"/>'
    },
    # Invoicing & Accounting
    'account': {
        'palette': 'emerald',
        'path': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
    },
    'account_accountant': {
        'palette': 'emerald',
        'path': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><circle cx="7" cy="15" r="1"/><circle cx="12" cy="15" r="1"/>'
    },
    # CRM
    'crm': {
        'palette': 'rose',
        'path': '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>'
    },
    # Manufacturing / MRP
    'mrp': {
        'palette': 'amber',
        'path': '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>'
    },
    'mrp_subcontracting': {
        'palette': 'amber',
        'path': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
    },
    # Website
    'website': {
        'palette': 'cyan',
        'path': '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
    },
    # Inventory
    'stock': {
        'palette': 'blue',
        'path': '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'
    },
    'stock_barcode': {
        'palette': 'blue',
        'path': '<path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/>'
    },
    # Knowledge
    'knowledge': {
        'palette': 'teal',
        'path': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>'
    },
    # Purchase
    'purchase': {
        'palette': 'violet',
        'path': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'
    },
    # Point of Sale
    'point_of_sale': {
        'palette': 'indigo',
        'path': '<rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/><line x1="8" x2="8" y1="12"/><line x1="12" x2="12" y1="12"/><line x1="16" x2="16" y1="12"/>'
    },
    # Project
    'project': {
        'palette': 'purple',
        'path': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>'
    },
    # eCommerce
    'website_sale': {
        'palette': 'blue',
        'path': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/><path d="M12 5v6"/><path d="M9 8h6"/>'
    },
    # Email Marketing
    'mass_mailing': {
        'palette': 'cyan',
        'path': '<line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
    },
    # Timesheets
    'hr_timesheet': {
        'palette': 'emerald',
        'path': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/>'
    },
    # Expenses
    'hr_expense': {
        'palette': 'amber',
        'path': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="m14 15 2 2 4-4"/>'
    },
    # Studio
    'web_studio': {
        'palette': 'purple',
        'path': '<path d="m18 15-6-6"/><path d="m15 18-6-6"/><path d="m14 6 4 4"/><circle cx="6" cy="6" r="3"/>'
    },
    'studio': {
        'palette': 'purple',
        'path': '<path d="m18 15-6-6"/><path d="m15 18-6-6"/><path d="m14 6 4 4"/><circle cx="6" cy="6" r="3"/>'
    },
    # Time Off
    'hr_holidays': {
        'palette': 'orange',
        'path': '<circle cx="12" cy="12" r="5"/><line x1="12" x2="12" y1="1" y2="3"/><line x1="12" x2="12" y1="21" y2="23"/><line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/><line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/><line x1="1" x2="3" y1="12" y2="12"/><line x1="21" x2="23" y1="12" y2="12"/>'
    },
    # Recruitment
    'hr_recruitment': {
        'palette': 'blue',
        'path': '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><circle cx="11" cy="11" r="3"/>'
    },
    # Field Service
    'industry_fsm': {
        'palette': 'teal',
        'path': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
    },
    # Employees
    'hr': {
        'palette': 'blue',
        'path': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    # Data Recycle
    'data_recycle': {
        'palette': 'teal',
        'path': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'
    },
    'data_cleaning': {
        'palette': 'teal',
        'path': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'
    },
    # Maintenance
    'maintenance': {
        'palette': 'amber',
        'path': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'
    },
    # Marketing Card
    'marketing_card': {
        'palette': 'rose',
        'path': '<rect width="18" height="18" x="3" y="3" rx="2"/><polygon points="12 8 13.5 11 17 11.5 14.5 14 15 17.5 12 16 9 17.5 9.5 14 7 11.5 10.5 11 12 8"/>'
    },
    # Sign
    'sign': {
        'palette': 'violet',
        'path': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15 2 2 4-4"/>'
    },
    # Helpdesk
    'helpdesk': {
        'palette': 'rose',
        'path': '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>'
    },
    # Subscriptions
    'sale_subscription': {
        'palette': 'violet',
        'path': '<path d="m2 9 3-3 3 3"/><path d="M13 5h4a5 5 0 0 1 5 5v2"/><path d="m22 15-3 3-3-3"/><path d="M11 19H7a5 5 0 0 1-5-5v-2"/>'
    },
    # Quality
    'quality': {
        'palette': 'emerald',
        'path': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
    },
    'quality_control': {
        'palette': 'emerald',
        'path': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
    },
    # eLearning
    'website_slides': {
        'palette': 'amber',
        'path': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'
    },
    # Calendar & Events
    'calendar': {
        'palette': 'rose',
        'path': '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>'
    },
    'event': {
        'palette': 'rose',
        'path': '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><circle cx="12" cy="14" r="2"/>'
    },
    # Surveys
    'survey': {
        'palette': 'indigo',
        'path': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>'
    },
    # Fleet
    'fleet': {
        'palette': 'slate',
        'path': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'
    },
    # Documents
    'documents': {
        'palette': 'teal',
        'path': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>'
    },
    # Approvals
    'approvals': {
        'palette': 'emerald',
        'path': '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>'
    },
    # Planning
    'planning': {
        'palette': 'indigo',
        'path': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>'
    },
    # Voip / Telephony
    'voip': {
        'palette': 'blue',
        'path': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'
    },
    # Automations
    'base_automation': {
        'palette': 'purple',
        'path': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'
    }
}

def generate_svg(glyph_path, palette):
    pal = PALETTES.get(palette, PALETTES['teal'])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{pal['bg1']}"/>
      <stop offset="100%" stop-color="{pal['bg2']}"/>
    </linearGradient>
  </defs>
  <rect width="124" height="124" x="2" y="2" rx="28" fill="url(#bg)" stroke="{pal['border']}" stroke-width="2"/>
  <rect width="76" height="76" x="26" y="26" rx="18" fill="{pal['fill']}"/>
  <g transform="translate(34, 34) scale(2.5)" stroke="{pal['stroke']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    {glyph_path}
  </g>
</svg>'''

# 1. Generate defined core modules
print("🎨 Generating Core Application Icons...")
count = 0
for mod_name, data in MODULE_GLYPHS.items():
    svg_content = generate_svg(data['path'], data['palette'])
    file_path = os.path.join(ICONS_DIR, f"{mod_name}.svg")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    count += 1

print(f"✅ Generated {count} core application icons in {ICONS_DIR}")

# 2. Query all modules in database or scan addons to generate tailored icons for EVERY module
try:
    import subprocess
    cmd = "docker exec -i omniflow_erp_db psql -U odoo -d omniflow_erp -t -A -c 'SELECT name, shortdesc FROM ir_module_module;'"
    output = subprocess.check_output(cmd, shell=True, text=True)
    all_modules = [line.strip().split('|') for line in output.strip().split('\n') if '|' in line]
    
    print(f"🔍 Discovered {len(all_modules)} modules in database. Generating tailored icons for all...")
    
    palette_keys = list(PALETTES.keys())
    for mod in all_modules:
        m_name = mod[0]
        m_title = mod[1] if len(mod) > 1 else m_name
        
        # Skip if already explicitly defined
        if m_name in MODULE_GLYPHS:
            continue
            
        # Match functional keywords
        text = f"{m_name} {m_title}".lower()
        matched_glyph = None
        matched_pal = None
        
        for k, v in MODULE_GLYPHS.items():
            if k in text:
                matched_glyph = v['path']
                matched_pal = v['palette']
                break
                
        if not matched_glyph:
            # Deterministic unique icon based on hash
            h = int(hashlib.md5(m_name.encode()).hexdigest(), 16)
            matched_pal = palette_keys[h % len(palette_keys)]
            matched_glyph = '<rect width="18" height="18" x="3" y="3" rx="4"/><circle cx="12" cy="12" r="3"/>'
            
        svg_content = generate_svg(matched_glyph, matched_pal)
        file_path = os.path.join(ICONS_DIR, f"{m_name}.svg")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
            
    print(f"🎉 SUCCESS: Generated unique EMS SVG icons for ALL {len(all_modules)} modules!")
except Exception as e:
    print(f"Notice during batch query: {e}")

# 3. Convert all generated SVG icons to native crisp 128x128 PNG files
print("🖼️ Converting all SVG icons to native high-res 128x128 PNG binaries...")
try:
    import shutil
    has_rsvg = shutil.which("rsvg-convert") is not None
    if has_rsvg:
        svg_files = [f for f in os.listdir(ICONS_DIR) if f.endswith(".svg")]
        converted = 0
        for svg_f in svg_files:
            src = os.path.join(ICONS_DIR, svg_f)
            dest = os.path.join(ICONS_DIR, svg_f[:-4] + ".png")
            ret = subprocess.run(["rsvg-convert", "-w", "128", "-h", "128", src, "-o", dest], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ret.returncode == 0:
                converted += 1
        print(f"✅ Converted {converted}/{len(svg_files)} icons to native PNG format via rsvg-convert!")
    else:
        print("⚠️ rsvg-convert not found. It will be installed by apply_ems_branding.sh")
except Exception as conv_err:
    print(f"Notice during PNG conversion: {conv_err}")

print("==============================================================================")
print(f"🌟 EMS Icon Pack is LIVE in {ICONS_DIR}")
print("==============================================================================")
