# -*- coding: utf-8 -*-
import base64
import hashlib
from odoo import models, fields, api

# ==============================================================================
# EMS Ultra-Modern Vector Glyphs & Color Palettes (Matching EMS Launcher)
# ==============================================================================

ICON_PALETTES = {
    'teal': {
        'bg1': '#f0fdfa', 'bg2': '#ccfbf1', 'border': '#99f6e4',
        'stroke': '#0d9488', 'fill': 'rgba(13, 148, 136, 0.12)'
    },
    'emerald': {
        'bg1': '#ecfdf5', 'bg2': '#d1fae5', 'border': '#a7f3d0',
        'stroke': '#059669', 'fill': 'rgba(5, 150, 105, 0.12)'
    },
    'blue': {
        'bg1': '#eff6ff', 'bg2': '#dbeafe', 'border': '#bfdbfe',
        'stroke': '#2563eb', 'fill': 'rgba(37, 99, 235, 0.12)'
    },
    'indigo': {
        'bg1': '#eef2ff', 'bg2': '#e0e7ff', 'border': '#c7d2fe',
        'stroke': '#4f46e5', 'fill': 'rgba(79, 70, 229, 0.12)'
    },
    'purple': {
        'bg1': '#faf5ff', 'bg2': '#f3e8ff', 'border': '#e9d5ff',
        'stroke': '#9333ea', 'fill': 'rgba(147, 51, 234, 0.12)'
    },
    'violet': {
        'bg1': '#f5f3ff', 'bg2': '#ede9fe', 'border': '#ddd6fe',
        'stroke': '#7c3aed', 'fill': 'rgba(124, 58, 237, 0.12)'
    },
    'rose': {
        'bg1': '#fff1f2', 'bg2': '#ffe4e6', 'border': '#fecdd3',
        'stroke': '#e11d48', 'fill': 'rgba(225, 29, 72, 0.12)'
    },
    'amber': {
        'bg1': '#fffbeb', 'bg2': '#fef3c7', 'border': '#fde68a',
        'stroke': '#d97706', 'fill': 'rgba(217, 119, 6, 0.12)'
    },
    'orange': {
        'bg1': '#fff7ed', 'bg2': '#ffedd5', 'border': '#fed7aa',
        'stroke': '#ea580c', 'fill': 'rgba(234, 88, 12, 0.12)'
    },
    'cyan': {
        'bg1': '#ecfeff', 'bg2': '#cffafe', 'border': '#a5f3fc',
        'stroke': '#0891b2', 'fill': 'rgba(8, 145, 178, 0.12)'
    },
    'slate': {
        'bg1': '#f8fafc', 'bg2': '#f1f5f9', 'border': '#e2e8f0',
        'stroke': '#475569', 'fill': 'rgba(71, 85, 105, 0.12)'
    }
}

# 24x24 Clean SVG paths for each app domain
APP_GLYPHS = {
    # Sales & Orders
    'sales': {
        'palette': 'teal',
        'path': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
    },
    # CRM & Opportunities
    'crm': {
        'palette': 'rose',
        'path': '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>'
    },
    # Inventory & Warehouse
    'inventory': {
        'palette': 'blue',
        'path': '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'
    },
    # Manufacturing (MRP)
    'manufacturing': {
        'palette': 'amber',
        'path': '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>'
    },
    # Invoicing & Accounting
    'invoicing': {
        'palette': 'emerald',
        'path': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
    },
    # Purchase & Vendors
    'purchase': {
        'palette': 'violet',
        'path': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'
    },
    # Point of Sale (POS)
    'pos': {
        'palette': 'indigo',
        'path': '<rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/><line x1="8" x2="8" y1="12"/><line x1="12" x2="12" y1="12"/><line x1="16" x2="16" y1="12"/>'
    },
    # Website & Store
    'website': {
        'palette': 'cyan',
        'path': '<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
    },
    # Project & Tasks
    'project': {
        'palette': 'purple',
        'path': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>'
    },
    # HR & Employees
    'employees': {
        'palette': 'blue',
        'path': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    # Timesheets
    'timesheets': {
        'palette': 'emerald',
        'path': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/>'
    },
    # Expenses
    'expenses': {
        'palette': 'amber',
        'path': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'
    },
    # Restaurant & Food
    'restaurant': {
        'palette': 'orange',
        'path': '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" x2="6" y1="1" y2="4"/><line x1="10" x2="10" y1="1" y2="4"/><line x1="14" x2="14" y1="1" y2="4"/>'
    },
    # Helpdesk & Tickets
    'helpdesk': {
        'palette': 'rose',
        'path': '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>'
    },
    # Maintenance & Repairs
    'maintenance': {
        'palette': 'amber',
        'path': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'
    },
    # Fleet & Vehicles
    'fleet': {
        'palette': 'slate',
        'path': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'
    },
    # Knowledge & Docs
    'knowledge': {
        'palette': 'teal',
        'path': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>'
    },
    # Email Marketing
    'email_marketing': {
        'palette': 'cyan',
        'path': '<line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
    },
    # Subscriptions
    'subscriptions': {
        'palette': 'violet',
        'path': '<path d="m2 9 3-3 3 3"/><path d="M13 5h4a5 5 0 0 1 5 5v2"/><path d="m22 15-3 3-3-3"/><path d="M11 19H7a5 5 0 0 1-5-5v-2"/>'
    },
    # Quality & Inspection
    'quality': {
        'palette': 'emerald',
        'path': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
    },
    # Events & Calendar
    'calendar': {
        'palette': 'rose',
        'path': '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>'
    },
    # Surveys
    'survey': {
        'palette': 'indigo',
        'path': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>'
    },
    # Studio & Developer
    'studio': {
        'palette': 'purple',
        'path': '<path d="m18 15-6-6"/><path d="m15 18-6-6"/><path d="m14 6 4 4"/><circle cx="6" cy="6" r="3"/>'
    },
    # Data Cleaning / Recycle
    'data_recycle': {
        'palette': 'teal',
        'path': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'
    },
    # Recruitment
    'recruitment': {
        'palette': 'blue',
        'path': '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><circle cx="11" cy="11" r="3"/>'
    },
    # Time Off & Leaves
    'time_off': {
        'palette': 'orange',
        'path': '<circle cx="12" cy="12" r="5"/><line x1="12" x2="12" y1="1" y2="3"/><line x1="12" x2="12" y1="21" y2="23"/><line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/><line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/><line x1="1" x2="3" y1="12" y2="12"/><line x1="21" x2="23" y1="12" y2="12"/>'
    },
    # Sign & Contracts
    'sign': {
        'palette': 'violet',
        'path': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15 2 2 4-4"/>'
    },
    # Default Functional Box
    'default': {
        'palette': 'teal',
        'path': '<rect width="18" height="18" x="3" y="3" rx="4"/><circle cx="12" cy="12" r="3"/>'
    }
}

class IrModuleModule(models.Model):
    _inherit = 'ir.module.module'

    def _generate_ems_svg_icon(self, glyph_key, custom_palette=None):
        """Build high-resolution vector SVG matching EMS Launcher card aesthetic"""
        glyph_data = APP_GLYPHS.get(glyph_key, APP_GLYPHS['default'])
        palette_key = custom_palette or glyph_data.get('palette', 'teal')
        pal = ICON_PALETTES.get(palette_key, ICON_PALETTES['teal'])

        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{pal['bg1']}"/>
      <stop offset="100%" stop-color="{pal['bg2']}"/>
    </linearGradient>
  </defs>
  <rect width="124" height="124" x="2" y="2" rx="28" fill="url(#bg)" stroke="{pal['border']}" stroke-width="2"/>
  <rect width="76" height="76" x="26" y="26" rx="18" fill="{pal['fill']}"/>
  <g transform="translate(34, 34) scale(2.5)" stroke="{pal['stroke']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    {glyph_data['path']}
  </g>
</svg>'''
        return base64.b64encode(svg.encode('utf-8'))

    def _resolve_glyph_for_module(self, name, shortdesc, category):
        """Map every single module name to its unique purpose-built glyph and color"""
        text = f"{name or ''} {shortdesc or ''} {category or ''}".lower()

        if any(k in text for k in ['sale', 'quotation', 'order', 'pricelist', 'coupon']):
            return 'sales'
        if any(k in text for k in ['crm', 'lead', 'opportunity', 'pipeline']):
            return 'crm'
        if any(k in text for k in ['stock', 'inventory', 'warehouse', 'delivery', 'picking', 'pallet']):
            return 'inventory'
        if any(k in text for k in ['mrp', 'manufacturing', 'workorder', 'bom', 'production']):
            return 'manufacturing'
        if any(k in text for k in ['account', 'invoice', 'payment', 'tax', 'bill', 'ledger', 'gst', 'l10n']):
            return 'invoicing'
        if any(k in text for k in ['purchase', 'vendor', 'rfq', 'supplier']):
            return 'purchase'
        if any(k in text for k in ['point_of_sale', 'pos', 'cashier', 'terminal']):
            return 'pos'
        if any(k in text for k in ['restaurant', 'dining', 'table', 'food', 'kitchen']):
            return 'restaurant'
        if any(k in text for k in ['website', 'ecommerce', 'shop', 'online', 'blog']):
            return 'website'
        if any(k in text for k in ['project', 'task', 'milestone', 'kanban']):
            return 'project'
        if any(k in text for k in ['employee', 'hr', 'department', 'staff']):
            return 'employees'
        if any(k in text for k in ['timesheet', 'attendance', 'clock']):
            return 'timesheets'
        if any(k in text for k in ['expense', 'reimbursement']):
            return 'expenses'
        if any(k in text for k in ['helpdesk', 'ticket', 'support', 'issue']):
            return 'helpdesk'
        if any(k in text for k in ['maintenance', 'repair', 'equipment']):
            return 'maintenance'
        if any(k in text for k in ['fleet', 'vehicle', 'car']):
            return 'fleet'
        if any(k in text for k in ['knowledge', 'document', 'wiki', 'vault']):
            return 'knowledge'
        if any(k in text for k in ['mail', 'marketing', 'newsletter', 'campaign']):
            return 'email_marketing'
        if any(k in text for k in ['subscription', 'recurring']):
            return 'subscriptions'
        if any(k in text for k in ['quality', 'inspection', 'qc']):
            return 'quality'
        if any(k in text for k in ['calendar', 'event', 'appointment']):
            return 'calendar'
        if any(k in text for k in ['survey', 'poll', 'feedback', 'quiz']):
            return 'survey'
        if any(k in text for k in ['studio', 'custom', 'builder']):
            return 'studio'
        if any(k in text for k in ['recycle', 'clean', 'archive']):
            return 'data_recycle'
        if any(k in text for k in ['recruit', 'job', 'applicant', 'resume']):
            return 'recruitment'
        if any(k in text for k in ['leave', 'holiday', 'time_off']):
            return 'time_off'
        if any(k in text for k in ['sign', 'contract', 'signature']):
            return 'sign'

        # Consistent deterministic palette for miscellaneous 700+ apps
        palettes = list(ICON_PALETTES.keys())
        hash_idx = int(hashlib.md5((name or '').encode()).hexdigest(), 16) % len(palettes)
        return 'default', palettes[hash_idx]

    @api.depends('name', 'icon', 'shortdesc')
    def _get_icon_image(self):
        super()._get_icon_image()
        for module in self:
            res = self._resolve_glyph_for_module(
                module.name,
                module.shortdesc,
                module.category_id.name if module.category_id else ''
            )
            if isinstance(res, tuple):
                glyph_key, custom_pal = res
            else:
                glyph_key, custom_pal = res, None

            module.icon_image = self._generate_ems_svg_icon(glyph_key, custom_pal)
