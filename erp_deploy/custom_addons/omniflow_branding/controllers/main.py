# -*- coding: utf-8 -*-
import odoo
from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from contextlib import ExitStack

class EMSAutoLoginController(Home):
    @http.route(['/web/autologin', '/ems/login'], type='http', auth='none', csrf=False)
    def ems_autologin(self, db='omniflow_erp', **kw):
        """Zero-login bypass for seamless EMS embedding - Native Odoo 19"""
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
                    return request.redirect('/odoo')
        except Exception:
            pass

        # 2. Fallback: redirect to login with prefilled email
        return request.redirect('/web/login?login=kavayanshchopra@gmail.com')
