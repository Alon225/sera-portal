/* SERA Management - shared helpers for the static web pages.
   Plain browser JS, no dependencies. Exposes window.Sera. */
(function (global) {
  'use strict';

  var DEFAULT_BASE = 'https://oljcnfcvjvpkwcabmsjd.supabase.co';
  var BASE_KEY = 'sera.base';
  var LANG_KEY = 'sera.lang';
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

  /* ---------- i18n ----------
     Dictionaries: DICT.en / DICT.he. Pages add their own keys with
     Sera.i18n.extend({en:{...}, he:{...}}). Static markup is marked with
     data-i18n="key" (textContent), data-i18n-placeholder, data-i18n-title
     (sets title and aria-label). applyLanguage() re-applies them, sets
     <html lang dir> and fires "sera:lang" on document so pages can re-render
     dynamic content. */

  var LANGS = { en: { dir: 'ltr', locale: 'en-US', label: 'EN' }, he: { dir: 'rtl', locale: 'he-IL', label: 'עב' } };

  var DICT = {
    en: {
      /* shared: errors */
      'err.invalid_key': 'This product key was not recognised. Check it and try again.',
      'err.rate_limited': 'Too many requests. Wait a minute and try again.',
      'err.invalid_request': 'The server rejected the request as invalid.',
      'err.server_error': 'The server ran into a problem. Try again in a moment.',
      'err.unauthorized': 'The admin token was rejected. Check the token and the base URL.',
      'err.forbidden': 'The admin token was rejected. Check the token and the base URL.',
      'err.not_found': 'Not found. Check the base URL (the function may not be deployed).',
      'err.timeout': 'The request timed out after 15 seconds.',
      'err.network': 'Could not reach the server. Check the base URL and your connection.',
      'err.bad_response': 'The server returned an unexpected response.',
      'err.failed': 'Request failed ({code}).',
      'err.generic': 'Something went wrong. Try again.',
      /* shared: relative time */
      'rel.just_now': 'just now',
      'rel.under_minute': 'in under a minute',
      'rel.min': '{n} min',
      'rel.hour': '{n} h',
      'rel.day': '{n} day',
      'rel.days': '{n} days',
      'rel.ago': '{s} ago',
      'rel.in': 'in {s}',
      /* shared: status badge */
      'status.active': 'active',
      'status.past_due': 'past due',
      'status.canceled': 'canceled',
      'status.cancelled': 'cancelled',
      'status.expired': 'expired',
      'status.unknown': 'unknown',
      /* shared: dialogs */
      'dlg.sure': 'Are you sure?',
      'dlg.cancel': 'Cancel',
      'dlg.confirm': 'Confirm',
      'dlg.server': 'Server',
      'dlg.base_title': 'API base URL',
      'dlg.base_body': 'Where the SERA functions are hosted. Stored in this browser only.',
      'dlg.base_label': 'Base URL',
      'dlg.base_default': 'Default: {base}',
      'dlg.use_default': 'Use default',
      'dlg.save': 'Save',
      'dlg.server_set': 'Server set to {host}',
      /* shared: chrome */
      'common.brand': 'SERA Management',
      'common.footer': 'SERA Management · not affiliated with NinjaTrader LLC',
      'common.change_server': 'Change server',
      'common.server_settings': 'Server settings',
      'common.support': 'Support',
      'common.language': 'Language',
      'common.loading': 'Loading…',
      'common.close': 'Close',
      'common.refresh': 'Refresh',
      'common.copy': 'Copy',
      'common.copied': 'Copied',
      'common.copy_failed': 'Copy failed'
    },
    he: {
      'err.invalid_key': 'מפתח המוצר לא זוהה. בדוק אותו ונסה שוב.',
      'err.rate_limited': 'יותר מדי בקשות. המתן דקה ונסה שוב.',
      'err.invalid_request': 'השרת דחה את הבקשה כלא תקינה.',
      'err.server_error': 'השרת נתקל בבעיה. נסה שוב בעוד רגע.',
      'err.unauthorized': 'טוקן הניהול נדחה. בדוק את הטוקן ואת כתובת השרת.',
      'err.forbidden': 'טוקן הניהול נדחה. בדוק את הטוקן ואת כתובת השרת.',
      'err.not_found': 'לא נמצא. בדוק את כתובת השרת (ייתכן שהפונקציה לא פרוסה).',
      'err.timeout': 'הבקשה לא נענתה תוך 15 שניות.',
      'err.network': 'אין חיבור לשרת. בדוק את כתובת השרת ואת החיבור לאינטרנט.',
      'err.bad_response': 'השרת החזיר תשובה לא צפויה.',
      'err.failed': 'הבקשה נכשלה ({code}).',
      'err.generic': 'משהו השתבש. נסה שוב.',
      'rel.just_now': 'עכשיו',
      'rel.under_minute': 'בעוד פחות מדקה',
      'rel.min': '{n} דק׳',
      'rel.hour': '{n} שע׳',
      'rel.day': 'יום',
      'rel.days': '{n} ימים',
      'rel.ago': 'לפני {s}',
      'rel.in': 'בעוד {s}',
      'status.active': 'פעיל',
      'status.past_due': 'בפיגור',
      'status.canceled': 'בוטל',
      'status.cancelled': 'בוטל',
      'status.expired': 'פג תוקף',
      'status.unknown': 'לא ידוע',
      'dlg.sure': 'האם אתה בטוח?',
      'dlg.cancel': 'ביטול',
      'dlg.confirm': 'אישור',
      'dlg.server': 'שרת',
      'dlg.base_title': 'כתובת שרת ה-API',
      'dlg.base_body': 'היכן מתארחות פונקציות SERA. נשמר בדפדפן זה בלבד.',
      'dlg.base_label': 'כתובת בסיס',
      'dlg.base_default': 'ברירת מחדל: {base}',
      'dlg.use_default': 'ברירת מחדל',
      'dlg.save': 'שמירה',
      'dlg.server_set': 'השרת הוגדר ל-{host}',
      'common.brand': 'SERA Management',
      'common.footer': 'SERA Management · אינו קשור ל-NinjaTrader LLC',
      'common.change_server': 'החלפת שרת',
      'common.server_settings': 'הגדרות שרת',
      'common.support': 'תמיכה',
      'common.language': 'שפה',
      'common.loading': 'טוען…',
      'common.close': 'סגירה',
      'common.refresh': 'רענון',
      'common.copy': 'העתקה',
      'common.copied': 'הועתק',
      'common.copy_failed': 'ההעתקה נכשלה'
    }
  };

  var lang = 'en';

  function normalizeLang(code) {
    code = String(code || '').toLowerCase();
    return code.indexOf('he') === 0 || code.indexOf('iw') === 0 ? 'he' : code.indexOf('en') === 0 ? 'en' : '';
  }
  function detectLang() {
    var stored = normalizeLang(storageGet(localStorage, LANG_KEY));
    if (stored) return stored;
    var nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    for (var i = 0; i < nav.length; i++) {
      var n = normalizeLang(nav[i]);
      if (n) return n;
    }
    return 'en';
  }
  function getLang() { return lang; }

  function extend(dicts) {
    Object.keys(dicts || {}).forEach(function (code) {
      if (!DICT[code]) DICT[code] = {};
      var src = dicts[code] || {};
      Object.keys(src).forEach(function (k) { DICT[code][k] = src[k]; });
    });
  }

  /* t(key, {name: value}) — "{name}" placeholders are substituted. Falls back to English, then the key. */
  function t(key, params) {
    var s = DICT[lang] && DICT[lang][key] !== undefined ? DICT[lang][key] : (DICT.en[key] !== undefined ? DICT.en[key] : key);
    if (params) {
      s = String(s).replace(/\{(\w+)\}/g, function (m, name) {
        return params[name] !== undefined && params[name] !== null ? String(params[name]) : m;
      });
    }
    return s;
  }

  function applyDom(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    var i;
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    nodes = root.querySelectorAll('[data-i18n-placeholder]');
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute('placeholder', t(nodes[i].getAttribute('data-i18n-placeholder')));
    nodes = root.querySelectorAll('[data-i18n-title]');
    for (i = 0; i < nodes.length; i++) {
      var v = t(nodes[i].getAttribute('data-i18n-title'));
      nodes[i].setAttribute('title', v);
      nodes[i].setAttribute('aria-label', v);
    }
    nodes = root.querySelectorAll('[data-sera-lang]');
    for (i = 0; i < nodes.length; i++) {
      var on = nodes[i].getAttribute('data-sera-lang') === lang;
      nodes[i].classList.toggle('active', on);
      nodes[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function applyLanguage(code, opts) {
    opts = opts || {};
    var next = normalizeLang(code) || 'en';
    var changed = next !== lang;
    lang = next;
    var meta = LANGS[lang];
    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', meta.dir);
    buildFormatters();
    applyDom(document);
    if (opts.persist !== false) storageSet(localStorage, LANG_KEY, lang);
    if (changed || opts.force) {
      try { document.dispatchEvent(new CustomEvent('sera:lang', { detail: { lang: lang } })); } catch (e) { /* old browser */ }
    }
    return lang;
  }

  /* Wires [data-sera-lang="en|he"] buttons. */
  function bindLangToggle() {
    var nodes = document.querySelectorAll('[data-sera-lang]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('click', function (e) {
        e.preventDefault();
        applyLanguage(this.getAttribute('data-sera-lang'));
      });
    }
  }

  function onLanguage(fn) { document.addEventListener('sera:lang', function (e) { fn(e.detail ? e.detail.lang : lang); }); }

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

  var FRIENDLY_CODES = ['invalid_key', 'rate_limited', 'invalid_request', 'server_error', 'unauthorized', 'forbidden', 'not_found', 'timeout', 'network', 'bad_response'];

  function friendly(err) {
    if (err && err.name === 'SeraError') {
      if (FRIENDLY_CODES.indexOf(err.code) >= 0) return t('err.' + err.code);
      if (err.message && err.message !== err.code) return err.message;
      return t('err.failed', { code: err.code });
    }
    return t('err.generic');
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

  var dtFull, dtDay;
  function buildFormatters() {
    var locale = LANGS[lang].locale;
    dtFull = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    dtDay = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  buildFormatters();

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
    if (abs < MIN) return diff <= 0 ? t('rel.just_now') : t('rel.under_minute');
    if (abs < HOUR) { s = t('rel.min', { n: Math.round(abs / MIN) }); }
    else if (abs < DAY) { s = t('rel.hour', { n: Math.round(abs / HOUR) }); }
    else { var n = Math.round(abs / DAY); s = t(n === 1 ? 'rel.day' : 'rel.days', { n: n }); }
    return diff < 0 ? t('rel.ago', { s: s }) : t('rel.in', { s: s });
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
    var label = DICT.en['status.' + s] !== undefined ? t('status.' + s) : s.replace(/_/g, ' ');
    return '<span class="badge badge-' + kind + '">' + esc(label) + '</span>';
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
      var key = btn.getAttribute('data-i18n');
      if (key) btn.textContent = t(key);
      else if (btn.dataset.label) btn.textContent = btn.dataset.label;
      delete btn.dataset.label;
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
      html += '<h2>' + esc(opts.title || t('dlg.sure')) + '</h2>';
      if (opts.body) html += '<p class="muted">' + esc(opts.body) + '</p>';
      if (opts.prompt) {
        html += '<div class="field"><label class="label">' + esc(opts.prompt.label || '') +
          '</label><input class="input" name="value" autocomplete="off" placeholder="' + esc(opts.prompt.placeholder || '') + '"></div>';
      }
      html += '<div class="dialog-actions">' +
        '<button type="button" class="btn" value="cancel" data-cancel>' + esc(opts.cancelLabel || t('dlg.cancel')) + '</button>' +
        '<button type="submit" class="btn ' + (opts.danger ? 'btn-danger btn-solid' : 'btn-primary') + '" value="ok">' +
        esc(opts.confirmLabel || t('dlg.confirm')) + '</button></div></form>';
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
      '<div class="eyebrow">' + esc(t('dlg.server')) + '</div>' +
      '<h2>' + esc(t('dlg.base_title')) + '</h2>' +
      '<p class="muted">' + esc(t('dlg.base_body')) + '</p>' +
      '<div class="field"><label class="label" for="sera-base-input">' + esc(t('dlg.base_label')) + '</label>' +
      '<input id="sera-base-input" class="input" type="url" autocomplete="off" spellcheck="false" name="base" dir="ltr"></div>' +
      '<div class="hint">' + esc(t('dlg.base_default', { base: DEFAULT_BASE })) + '</div>' +
      '<div class="dialog-actions">' +
      '<button type="button" class="btn" data-reset>' + esc(t('dlg.use_default')) + '</button>' +
      '<button type="button" class="btn" data-cancel>' + esc(t('dlg.cancel')) + '</button>' +
      '<button type="submit" class="btn btn-primary">' + esc(t('dlg.save')) + '</button>' +
      '</div></form>';
    document.body.appendChild(dlg);
    var input = dlg.querySelector('input[name=base]');
    input.value = getBase();
    function cleanup() { try { dlg.close(); } catch (e) { /* ignore */ } setTimeout(function () { dlg.remove(); }, 0); }
    dlg.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var base = setBase(input.value);
      cleanup();
      toast(t('dlg.server_set', { host: hostOf(base) }), 'success');
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

  /* Pick the initial language before first paint (no persist: a detected
     default is not written until the user chooses). */
  applyLanguage(detectLang(), { persist: false });

  global.Sera = {
    DEFAULT_BASE: DEFAULT_BASE,
    TIMEOUT_MS: TIMEOUT_MS,
    LANG_KEY: LANG_KEY,
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
    storageSet: storageSet,
    /* i18n */
    t: t,
    getLang: getLang,
    applyLanguage: applyLanguage,
    bindLangToggle: bindLangToggle,
    onLanguage: onLanguage,
    i18n: { extend: extend, dict: DICT, langs: LANGS, t: t, applyDom: applyDom }
  };
})(window);
