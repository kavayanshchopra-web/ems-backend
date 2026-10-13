# -*- coding: utf-8 -*-
{
    'name': 'OmniFlow EMS - Brand System & Debranding',
    'version': '19.0.1.0.0',
    'summary': 'Teal & Emerald Brand Theming, Complete Debranding, and Auto-Login',
    'sequence': 1,
    'author': 'OmniFlow EMS Engineering',
    'category': 'Themes/Backend',
    'license': 'LGPL-3',
    'depends': ['web', 'base'],
    'data': [
        'views/webclient_templates.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'omniflow_branding/static/src/scss/brand_variables.scss',
            'omniflow_branding/static/src/scss/brand_theme.scss',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
