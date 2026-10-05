/* SERA Management - shared helpers for the static web pages.
   Plain browser JS, no dependencies. Exposes window.Sera. */
(function (global) {
  'use strict';

  var DEFAULT_BASE = 'https://oljcnfcvjvpkwcabmsjd.supabase.co';
  var BASE_KEY = 'sera.base';
  var TIMEOUT_MS = 15000;

  /* ---------- storage (never throws) ---------- */

  function storageGet(store, key) {
    try { return store.getItem(key); } catch (e) { return null; }
  }
  function storageSet(store, key, value) {
    try {
      if (value === null || value === undefined || value === '') store.removeItem(key);
      else store.setItem(key, value);
    } catch (e) { /* storage unavailable (private mode etc.) */ }
  }

  /* ---------- base URL ---------- */

  function normalizeBase(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v.replace(/\/+$/, '');
  }
  function getBase() {
    return normalizeBase(storageGet(localStorage, BASE_KEY)) || DEFAULT_BASE;
  }
  function setBase(v) {
    var n = normalizeBase(v);
    storageSet(localStorage, BASE_KEY, n && n !== DEFAULT_BASE ? n : null);
    return getBase();
  }
  function hostOf(url) {
    try { return new URL(url).host; } catch (e) { return String(url || ''); }
  }

  /* ---------- API calls ---------- */

  function SeraError(code, message, status) {
    this.name = 'SeraError';
    this.code = code || 'unknown';
    this.message = message || this.code;
    this.status = status || 0;
  }
  SeraError.prototype = Object.create(Error.prototype);
  SeraError.prototype.constructor = SeraError;

  var FRIENDLY = {
    invalid_key: 'This product key was not recognised. Check it and try again.',
    rate_limited: 'Too many requests. Wait a minute and try again.',
    invalid_request: 'The server rejected the request as invalid.',
    server_error: 'The server ran into a problem. Try again in a moment.',
    unauthorized: 'The admin token was rejected. Check the token and the base URL.',
    forbidden: 'The admin token was rejected. Check the token and the base URL.',
    not_found: 'Not found. Check the base URL (the function may not be deployed).',
    timeout: 'The request timed out after 15 seconds.',
    network: 'Could not reach the server. Check the base URL and your connection.',
    bad_response: 'The server returned an unexpected response.'
  };

  function friendly(err) {
    if (err && err.name === 'SeraError') {
      if (FRIENDLY[err.code]) return FRIENDLY[err.code];
      if (err.message && err.message !== err.code) return err.message;
      return 'Request failed (' + err.code + ').';
    }
    return 'Something went wrong. Try again.';
  }

  function httpCode(status) {
    if (status === 401 || status === 403) return 'unauthorized';
    if (status === 404) return 'not_found';
    if (status === 429) return 'rate_limited';
    if (status >= 500) return 'server_error';
    return 'http_' + status;
  }

  /* POST {base}/functions/v1/{fn} with a JSON body. Resolves with the parsed
     {ok:true,...} object, rejects with SeraError. Never logs the body. */
  function call(fn, body, opts) {
    opts = opts || {};
    var url = getBase() + '/functions/v1/' + fn;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    var headers = { 'content-type': 'application/json' };
    var extra = opts.headers || {};
    Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });

    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: headers,
      body: JSON.stringify(body || {}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().catch(function () { return ''; }).then(function (text) {
        var data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
        if (data && typeof data === 'object') {
          if (data.ok === true) return data;
          if (data.ok === false) throw new SeraError(data.error || httpCode(res.status), data.message, res.status);
        }
        if (!res.ok) throw new SeraError(httpCode(res.status), null, res.status);
        throw new SeraError('bad_response');
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      if (e && e.name === 'AbortError') throw new SeraError('timeout');
      throw new SeraError('network');
    });
  }

  /* ---------- formatting ---------- */

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseDate(v) {
    if (!v) return null;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  var dtFull = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  var dtDay = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  function fmtDateTime(v) { var d = parseDate(v); return d ? dtFull.format(d) : '—'; }
  function fmtDate(v) { var d = parseDate(v); return d ? dtDay.format(d) : '—'; }

  /* "3 days ago" / "in 12 days" / "just now" */
  function relative(v) {
    var d = parseDate(v);
    if (!d) return '';
    var diff = d.getTime() - Date.now();
    var abs = Math.abs(diff);
    var MIN = 60000, HOUR = 3600000, DAY = 86400000;
    var s;
    if (abs < MIN) return diff <= 0 ? 'just now' : 'in under a minute';
    if (abs < HOUR) { var m = Math.round(abs / MIN); s = m + ' min'; }
    else if (abs < DAY) { var h = Math.round(abs / HOUR); s = h + ' h'; }
    else { var n = Math.round(abs / DAY); s = n + (n === 1 ? ' day' : ' days'); }
    return diff < 0 ? s + ' ago' : 'in ' + s;
  }

  /* Date + relative, e.g. "Oct 5, 2026 · in 12 days" (HTML, escaped). */
  function dateWithRelative(v) {
    var d = parseDate(v);
    if (!d) return '<span class="faint">—</span>';
    return '<span title="' + esc(fmtDateTime(v)) + '">' + esc(fmtDate(v)) +
      '</span> <span class="faint">· ' + esc(relative(v)) + '</span>';
  }

  var STATUS_KIND = { active: 'success', past_due: 'warning', canceled: 'danger', cancelled: 'danger', expired: 'neutral' };
  function statusBadge(status) {
    var s = String(status || 'unknown');
    var kind = STATUS_KIND[s] || 'neutral';
    return '<span class="badge badge-' + kind + '">' + esc(s.replace(/_/g, ' ')) + '</span>';
  }

  function shortHash(h, n) {
    h = String(h || '');
    return h.length > (n || 8) ? h.slice(0, n || 8) : h;
  }

  /* Accepts any case, dashes, spaces; returns the canonical SERA-XXXX-XXXX-XXXX-XXXX form. */
  function normalizeProductKey(raw) {
    var s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.indexOf('SERA') === 0) s = s.slice(4);
    var groups = s.match(/.{1,4}/g) || [];
    return { body: s, formatted: 'SERA-' + groups.join('-'), valid: s.length === 16 };
  }

  /* ---------- UI helpers ---------- */

  function toast(message, kind, ms) {
    var host = document.querySelector('.toasts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toasts';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'info');
    el.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
    el.textContent = message;
    host.appendChild(el);
    var life = ms || (kind === 'danger' ? 7000 : 4000);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 260);
    }, life);
    return el;
  }

  function showMsg(el, text, kind) {
    if (!el) return;
    el.className = 'msg' + (kind ? ' msg-' + kind : '');
    el.textContent = text;
    el.classList.remove('hidden');
  }
  function hideMsg(el) { if (el) el.classList.add('hidden'); }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.dataset.label || btn.textContent;
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      if (label) btn.textContent = label;
    } else {
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch (e) { return false; }
  }

  /* Modal confirm. Resolves {ok:boolean, value:string}. opts.prompt = {label, placeholder} adds a text field. */
  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var dlg = document.createElement('dialog');
      var html = '<form method="dialog" class="stack-sm">';
      if (opts.eyebrow) html += '<div class="eyebrow">' + esc(opts.eyebrow) + '</div>';
      html += '<h2>' + esc(opts.title || 'Are you sure?') + '</h2>';
      if (opts.body) html += '<p class="muted">' + esc(opts.body) + '</p>';
      if (opts.prompt) {
        html += '<div class="field"><label class="label">' + esc(opts.prompt.label || '') +
          '</label><input class="input" name="value" autocomplete="off" placeholder="' + esc(opts.prompt.placeholder || '') + '"></div>';
      }
      html += '<div class="dialog-actions">' +
        '<button type="button" class="btn" value="cancel" data-cancel>' + esc(opts.cancelLabel || 'Cancel') + '</button>' +
        '<button type="submit" class="btn ' + (opts.danger ? 'btn-danger btn-solid' : 'btn-primary') + '" value="ok">' +
        esc(opts.confirmLabel || 'Confirm') + '</button></div></form>';
      dlg.innerHTML = html;
      document.body.appendChild(dlg);
      var form = dlg.querySelector('form');
      var input = dlg.querySelector('input[name=value]');
      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        resolve({ ok: ok, value: input ? input.value.trim() : '' });
        try { dlg.close(); } catch (e) { /* already closed */ }
        setTimeout(function () { dlg.remove(); }, 0);
      }
      form.addEventListener('submit', function (e) { e.preventDefault(); finish(true); });
      dlg.querySelector('[data-cancel]').addEventListener('click', function () { finish(false); });
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); finish(false); });
      dlg.addEventListener('close', function () { finish(false); });
      dlg.showModal();
      if (input) input.focus();
    });
  }

  /* Settings dialog for the API base URL. onChange(base) is called after save. */
  function openBaseDialog(onChange) {
    var dlg = document.createElement('dialog');
    dlg.innerHTML =
      '<form method="dialog" class="stack-sm">' +
      '<div class="eyebrow">Server</div>' +
      '<h2>API base URL</h2>' +
      '<p class="muted">Where the SERA functions are hosted. Stored in this browser only.</p>' +
      '<div class="field"><label class="label" for="sera-base-input">Base URL</label>' +
      '<input id="sera-base-input" class="input" type="url" autocomplete="off" spellcheck="false" name="base"></div>' +
      '<div class="hint">Default: ' + esc(DEFAULT_BASE) + '</div>' +
      '<div class="dialog-actions">' +
      '<button type="button" class="btn" data-reset>Use default</button>' +
      '<button type="button" class="btn" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save</button>' +
      '</div></form>';
    document.body.appendChild(dlg);
    var input = dlg.querySelector('input[name=base]');
    input.value = getBase();
    function cleanup() { try { dlg.close(); } catch (e) { /* ignore */ } setTimeout(function () { dlg.remove(); }, 0); }
    dlg.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var base = setBase(input.value);
      cleanup();
      toast('Server set to ' + hostOf(base), 'success');
      if (onChange) onChange(base);
    });
    dlg.querySelector('[data-reset]').addEventListener('click', function () { input.value = DEFAULT_BASE; });
    dlg.querySelector('[data-cancel]').addEventListener('click', cleanup);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); cleanup(); });
    dlg.showModal();
    input.focus();
  }

  function bindSettingsLinks(onChange) {
    var nodes = document.querySelectorAll('[data-sera-settings]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('click', function (e) {
        e.preventDefault();
        openBaseDialog(onChange);
      });
    }
  }

  global.Sera = {
    DEFAULT_BASE: DEFAULT_BASE,
    TIMEOUT_MS: TIMEOUT_MS,
    SeraError: SeraError,
    getBase: getBase,
    setBase: setBase,
    hostOf: hostOf,
    call: call,
    friendly: friendly,
    esc: esc,
    parseDate: parseDate,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    relative: relative,
    dateWithRelative: dateWithRelative,
    statusBadge: statusBadge,
    shortHash: shortHash,
    normalizeProductKey: normalizeProductKey,
    toast: toast,
    showMsg: showMsg,
    hideMsg: hideMsg,
    setBusy: setBusy,
    copyText: copyText,
    confirmDialog: confirmDialog,
    openBaseDialog: openBaseDialog,
    bindSettingsLinks: bindSettingsLinks,
    storageGet: storageGet,
    storageSet: storageSet
  };
})(window);
