(function(){
  const AccessControl = {
    supabase: null,
    currentUser: null,
    role: null,
    permissions: {},
    config: { requireESigFor: ['approve','delete'] },

    async init({ supabase, moduleKey = null, requireESigFor = ['approve','delete'] } = {}){
      this.supabase = supabase
      this.config.requireESigFor = requireESigFor
      // Inject global theme stylesheet once per page
      try{ this._injectThemeCss(); }catch(_){ /* no-op */ }
      await this._loadUserRole()
      // expose helpers
      window.AccessControl = this
      return this
    },
    _injectThemeCss(){
      const id = 'valqms-theme-css-link'
      if(document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = 'assets/theme.css'
      document.head.appendChild(link)
    },

    async _loadUserRole(){
      try {
        const { data: { user } } = await this.supabase.auth.getUser()
        this.currentUser = user || null
        if (!user) return
        const { data: roleRow } = await this.supabase
          .from('user_roles')
          .select('*, roles ( id, role_name, permissions )')
          .eq('user_id', user.id)
          .maybeSingle()
        this.role = roleRow?.roles?.role_name || null
        this.permissions = roleRow?.roles?.permissions || {}
        // normalize
        this.permissions.applications = this.permissions.applications || {}
        this.permissions.tools = this.permissions.tools || {}
      } catch (e) {
        console.error('AccessControl load role error', e)
      }
    },

    has(scope, moduleKey, action){
      // scope: 'applications' | 'tools'
      if (!moduleKey || !action) return false
      // Superuser shortcut
      if (this.permissions?.all === true) return true
      const permsScope = this.permissions?.[scope] || {}
      const perms = permsScope?.[moduleKey] || {}
      return !!perms[action]
    },

    // Attach visibility/disable to elements by action map
    enforce(scope, moduleKey, map){
      // map: { create: ['#btnNewAudit'], edit: ['.edit-btn'], approve: [], delete: [], export: [] }
      const actions = Object.keys(map || {})
      actions.forEach(action => {
        const allowed = this.has(scope, moduleKey, action)
        const selectors = Array.isArray(map[action]) ? map[action] : [map[action]].filter(Boolean)
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            if (!allowed) {
              el.style.display = 'none'
              el.setAttribute('aria-hidden', 'true')
            } else {
              el.style.display = ''
              el.removeAttribute('aria-hidden')
            }
          })
        })
      })
    },

    async requireESign({ action, moduleKey, entityId = null, reasonLabel = 'Reason for signature' } = {}){
      const requires = this.config.requireESigFor.includes(action)
      if (!requires) return { ok: true }
      // Build modal
      const modal = document.createElement('div')
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:5000;'
      modal.innerHTML = `
        <div style="background:#fff;border-radius:12px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <div style="padding:18px 20px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827">Electronic Signature</div>
          <div style="padding:16px 20px;display:grid;gap:10px;">
            <div style="font-size:13px;color:#4b5563">Confirm your identity to proceed.</div>
            <label style="font-size:13px;color:#374151">Full Name
              <input id="esigFullName" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-top:6px" placeholder="Enter your full name" />
            </label>
            <label style="font-size:13px;color:#374151">PIN / Password
              <input id="esigPin" type="password" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-top:6px" placeholder="Enter your PIN or password" />
            </label>
            <label style="font-size:13px;color:#374151">${reasonLabel}
              <textarea id="esigReason" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-top:6px;min-height:70px" placeholder="Provide a brief reason"></textarea>
            </label>
          </div>
          <div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end">
            <button id="esigCancel" style="padding:10px 16px;border:2px solid #e5e7eb;border-radius:8px;background:#fff;color:#374151">Cancel</button>
            <button id="esigConfirm" style="padding:10px 16px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:700">Sign & Continue</button>
          </div>
        </div>`
      document.body.appendChild(modal)

      const destroy = () => modal.remove()

      const waitClick = () => new Promise(resolve => {
        modal.querySelector('#esigCancel').onclick = () => resolve({ ok:false })
        modal.querySelector('#esigConfirm').onclick = async () => {
          const full = modal.querySelector('#esigFullName').value?.trim()
          const pin = modal.querySelector('#esigPin').value
          const reason = modal.querySelector('#esigReason').value?.trim()
          if (!full || !pin || !reason) { alert('Please complete all fields'); return }
          const signature = await AccessControl._hash(`${full}|${this.currentUser?.email}|${pin}`)
          resolve({ ok:true, signature, full, reason })
        }
      })

      const result = await waitClick()
      destroy()
      if (!result.ok) return { ok:false }

      // Log signature to audit trail (as comment annotation) – server-side hardening recommended
      try {
        const ip = await this._getIP()
        await this._logAudit({
          entity_type: moduleKey,
          entity_id: entityId,
          action: `ESIGN:${action}`,
          field_changed: null,
          old_value: null,
          new_value: null,
          comments: `ESIG name=${result.full}; sig=${result.signature}; reason=${result.reason}`,
          ip_address: ip
        })
      } catch(e){ console.warn('esig trail log failed', e) }

      return result
    },

    async _logAudit({ entity_type, entity_id, action, field_changed, old_value, new_value, comments, ip_address }){
      try{
        await this.supabase.from('audit_trail_log').insert({
          audit_id: entity_type || null,
          entity_id: entity_id || null,
          action,
          field_changed,
          old_value,
          new_value,
          changed_by: this.currentUser?.email || 'unknown',
          changed_at: new Date().toISOString(),
          comments,
          ip_address
        })
      }catch(e){ console.error('audit trail insert failed', e) }
    },

    async _getIP(){
      try{
        const r = await fetch('https://api.ipify.org?format=json')
        const j = await r.json()
        return j.ip
      }catch{ return 'Unknown' }
    },

    async _hash(text){
      const enc = new TextEncoder().encode(text)
      const buf = await crypto.subtle.digest('SHA-256', enc)
      const bytes = Array.from(new Uint8Array(buf))
      return bytes.map(b => b.toString(16).padStart(2,'0')).join('')
    }
  }

  window.AccessControl = AccessControl
})();
