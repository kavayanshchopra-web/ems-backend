# -*- coding: utf-8 -*-
import odoo
from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from contextlib import ExitStack

class EMSAutoLoginController(Home):
    @http.route(['/web/autologin', '/ems/login'], type='http', auth='none', csrf=False)
    def ems_autologin(self, db='omniflow_erp', **kw):
        """Zero-login client-side transition for seamless EMS embedding - Native Odoo 19"""
        if not db:
            db = 'omniflow_erp'
        request.session.db = db

        # 1. Native Odoo 19 Session Authentication
        try:
            with ExitStack() as stack:
                if not request.db or request.db != db:
                    cr = stack.enter_context(odoo.modules.registry.Registry(db).cursor())
                    env = odoo.api.Environment(cr, None, {})
                else:
                    env = request.env

                credential = {'login': 'kavayanshchopra@gmail.com', 'password': 'Kavay@321', 'type': 'password'}
                auth_info = request.session.authenticate(env, credential)
                if auth_info and auth_info.get('uid'):
                    request.session.db = db
                    request._save_session(env)

                    # Return 200 OK HTML that commits cookie first, then transitions to /odoo
                    html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Connecting to ERP...</title>
    <meta http-equiv="refresh" content="0; url=/odoo">
    <style>
        body { margin: 0; background: #ffffff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
        .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div style="text-align: center;">
        <div class="spinner"></div>
    </div>
    <script>
        window.location.replace('/odoo');
    </script>
</body>
</html>"""
                    response = request.make_response(html, [('Content-Type', 'text/html; charset=utf-8')])
                    return response
        except Exception:
            pass

        return request.redirect('/odoo')
