# -*- coding: utf-8 -*-
{
    'name': 'EMS',
    'version': '19.0.1.0.0',
    'summary': 'EMS Brand System, Full Debranding and Auto-Login',
    'sequence': 1,
    'author': 'EMS',
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
