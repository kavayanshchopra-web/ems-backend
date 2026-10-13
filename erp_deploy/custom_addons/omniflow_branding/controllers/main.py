# -*- coding: utf-8 -*-
import odoo
from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home

class OmniFlowAutoLoginController(Home):
    @http.route('/web/autologin', type='http', auth='none', csrf=False)
    def omniflow_autologin(self, db='omniflow_erp', **kw):
        """Zero-login bypass for seamless OmniFlow EMS embedding"""
        target = kw.get('redirect', '/odoo/apps')
        # Try primary admin email
        for login, password in [('kavayanshchopra@gmail.com', 'Kavay@321'), ('admin', 'admin')]:
            try:
                uid = request.session.authenticate(db, login, password)
                if uid:
                    return request.redirect(target)
            except Exception:
                continue
        return request.redirect('/odoo/apps')
