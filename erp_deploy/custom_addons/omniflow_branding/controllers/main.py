# -*- coding: utf-8 -*-
import odoo
from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home

class EMSAutoLoginController(Home):
    @http.route(['/web/autologin', '/ems/login'], type='http', auth='none', csrf=False)
    def ems_autologin(self, db='omniflow_erp', **kw):
        """Zero-login bypass for seamless EMS embedding"""
        target = kw.get('redirect', '/web')
        for login, password in [('kavayanshchopra@gmail.com', 'Kavay@321'), ('admin', 'Kavay@321'), ('admin', 'admin')]:
            try:
                uid = request.session.authenticate(db, login, password)
                if uid:
                    return request.redirect(target)
            except Exception:
                continue
        return request.redirect(target)
