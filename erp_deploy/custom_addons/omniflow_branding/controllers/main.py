# -*- coding: utf-8 -*-
import odoo
from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from contextlib import ExitStack

class EMSAutoLoginController(Home):
    @http.route(['/web/autologin', '/ems/login'], type='http', auth='none', csrf=False)
    def ems_autologin(self, db='omniflow_erp', **kw):
        """Zero-login bypass for seamless EMS embedding - Native Odoo 19 Engine"""
        target = kw.get('redirect', '/web')
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

                for login, password in [('kavayanshchopra@gmail.com', 'Kavay@321'), ('admin', 'Kavay@321')]:
                    try:
                        credential = {'login': login, 'password': password, 'type': 'password'}
                        auth_info = request.session.authenticate(env, credential)
                        if auth_info and auth_info.get('uid'):
                            request.session.db = db
                            request._save_session(env)
                            res = request.redirect(target)
                            try:
                                res.set_cookie(
                                    'session_id', request.session.sid,
                                    max_age=90 * 86400,
                                    httponly=True,
                                    samesite='None',
                                    secure=True
                                )
                            except Exception:
                                pass
                            return res
                    except Exception:
                        continue
        except Exception:
            pass

        # 2. Direct session elevation (bulletproof fallback)
        try:
            with odoo.registry(db).cursor() as cr:
                env = odoo.api.Environment(cr, odoo.SUPERUSER_ID, {})
                user = env.ref('base.user_admin', raise_if_not_found=False) or env['res.users'].browse(2)
                if user and user.exists():
                    request.session.uid = user.id
                    request.session.login = user.login
                    request.session.db = db
                    if hasattr(user, '_compute_session_token'):
                        request.session.session_token = user._compute_session_token(request.session.sid)
                    request._save_session(env)
                    res = request.redirect(target)
                    try:
                        res.set_cookie(
                            'session_id', request.session.sid,
                            max_age=90 * 86400,
                            httponly=True,
                            samesite='None',
                            secure=True
                        )
                    except Exception:
                        pass
                    return res
        except Exception:
            pass

        return request.redirect(target)
