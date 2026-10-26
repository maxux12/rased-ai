
'use strict';

const $ = id => document.getElementById(id);
const storageKey = 'rased_archive_v1';
const apiKey = 'rased_api_v1';
const defaultApi = 'https://rased-ai-api.moathzak9.workers.dev';

const sources = [
  {words:['راتب','رواتب','مالية','موظفين'],name:'وزارة المالية الفلسطينية',url:'https://www.pmof.ps/'},
  {words:['صحة','مرض','دواء','مستشفى','وباء'],name:'وزارة الصحة الفلسطينية',url:'https://www.moh.ps/'},
  {words:['احصاء','إحصاء','سكان','نسبة'],name:'الجهاز المركزي للإحصاء الفلسطيني',url:'https://www.pcbs.gov.ps/'},
  {words:['حكومة','مجلس الوزراء','قرار حكومي'],name:'مجلس الوزراء الفلسطيني',url:'https://www.palestinecabinet.gov.ps/'},
  {words:['وفا','أخبار'],name:'وكالة الأنباء الفلسطينية وفا',url:'https://www.wafa.ps/'}
];

const node = (tag, content, cls) => {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = content;
  if (cls) el.className = cls;
  return el;
};

function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function archive() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveArchive(entry) {
  const arr = archive();
  arr.unshift(entry);
  localStorage.setItem(storageKey, JSON.stringify(arr.slice(0, 30)));
  renderArchive();
}

function renderArchive() {
  const root = $('history');
  root.replaceChildren();
  const arr = archive();

  if (!arr.length) {
    root.append(node('p', 'لا توجد تقارير محفوظة بعد.', 'hint'));
    return;
  }

  for (const e of arr) {
    const wrap = node('div', undefined, 'item');
    wrap.append(node('strong', String(e.text || '').slice(0, 110)));
    wrap.append(node('p', new Date(e.at).toLocaleString('ar-PS'), 'hint'));

    const b = node('button', 'عرض');
    b.onclick = () => renderReport(e.text, e.report, false);
    wrap.append(b);
    root.append(wrap);
  }
}

function localReport(text, errorMessage = '') {
  const matching = sources.filter(s =>
    s.words.some(w => text.includes(w))
  );

  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)]
    .map(m => m[0]);

  const limitations = [
    'لم يتم إجراء بحث حي في المصادر الرسمية.',
    'لم يتم التحقق من منشورات فيسبوك أو المصادر المقيدة.'
  ];

  if (errorMessage) limitations.unshift(errorMessage);

  if (years.length) {
    limitations.push(
      'يجب مقارنة تاريخ النشر بتاريخ الحدث: ' +
      [...new Set(years)].join('، ')
    );
  }

  return {
    verdict: 'غير محسوم',
    analysis: 'هذه نتيجة إرشادية فقط، ولا تثبت صحة الخبر أو تنفيه.',
    priority_sources: matching.map(s => ({
      name: s.name,
      url: s.url
    })),
    research_leads: [],
    limitations,
    searched_service: 'إرشاد محلي فقط'
  };
}

function normalizeReport(data, text) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('استجابة الخادم غير صالحة');
  }

  const matching = sources.filter(s =>
    s.words.some(w => text.includes(w))
  );

  const limitations = Array.isArray(data.limitations)
    ? [...data.limitations]
    : [];

  if (data.evidence_search_enabled === false) {
    limitations.unshift(
      'لم يتم البحث عن أدلة مستقلة بعد؛ هذه ليست نتيجة تحقق نهائية.'
    );
  }

  return {
    verdict:
      data.verdict_ar ||
      (data.verdict === 'unverified'
        ? 'غير محسوم'
        : data.verdict) ||
      'غير محسوم',

    analysis:
      data.explanation_ar ||
      data.analysis ||
      'لم تتوفر تفاصيل إضافية من الخادم.',

    priority_sources:
      Array.isArray(data.priority_sources)
        ? data.priority_sources
        : matching.map(s => ({
            name: s.name,
            url: s.url
          })),

    research_leads:
      Array.isArray(data.research_leads)
        ? data.research_leads
        : [],

    limitations,

    searched_service:
      data.evidence_search_enabled === false
        ? 'اتصال بالخادم دون بحث حي'
        : 'الخادم'
  };
}

function renderReport(text, report, store) {
  const root = $('result');
  root.hidden = false;
  root.replaceChildren();

  root.append(node('h3', 'نتيجة الفحص'));
  root.append(node('span', report.verdict || 'غير محسوم', 'tag'));
  root.append(node('p', report.analysis || 'لا توجد تفاصيل متاحة.'));

  const src = Array.isArray(report.priority_sources)
    ? report.priority_sources
    : [];

  if (src.length) {
    root.append(node('h3', 'جهات مختصة مقترحة'));

    for (const s of src) {
      const line = node('div', undefined, 'lead');
      line.append(node('strong', s.name || ''));

      const link = safeUrl(
        s.url || (s.domain ? 'https://' + s.domain + '/' : '')
      );

      if (link) {
        const a = node('a', ' زيارة الموقع الرسمي');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        line.append(a);
      }

      root.append(line);
    }
  }

  const leads = Array.isArray(report.research_leads)
    ? report.research_leads
    : [];

  root.append(node(
    'h3',
    'نتائج البحث المرشحة (' + leads.length + ')'
  ));

  if (!leads.length) {
    root.append(node('p', 'لم تتوفر نتائج بحث حي.', 'hint'));
  }

  for (const l of leads) {
    const href = safeUrl(l.url);
    if (!href) continue;

    const div = node('div', undefined, 'lead');
    const a = node('a', l.title || 'مصدر');

    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    div.append(a);

    div.append(node(
      'small',
      (l.published_at || 'تاريخ غير متاح') +
      ' • غير متحقق منه'
    ));

    root.append(div);
  }

  root.append(node('h3', 'حدود التحقق'));

  for (const lim of report.limitations || []) {
    root.append(node('p', '• ' + lim, 'hint'));
  }

  if (store) {
    saveArchive({
      text,
      report,
      at: new Date().toISOString()
    });
  }

  root.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

async function check() {
  const text = $('claim').value.trim();

  if (text.length < 10) {
    alert('أدخل خبراً أو رابطاً لا يقل عن 10 أحرف.');
    return;
  }

  if (text.length > 5000) {
    alert('الحد الأقصى هو 5000 حرف.');
    return;
  }

  const button = $('verify');
  button.disabled = true;
  button.textContent = 'جارٍ الفحص...';

  let report;

  try {
    const endpoint = (
      localStorage.getItem(apiKey) || defaultApi
    ).replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      18000
    );

    try {
      const response = await fetch(endpoint + '/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          claim: text
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();
      report = normalizeReport(data, text);

    } finally {
      clearTimeout(timer);
    }

  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'انتهت مهلة الاتصال بالخادم.'
      : String(error.message || error);

    report = localReport(
      text,
      'تعذر الاتصال بالخادم: ' + message
    );

  } finally {
    button.disabled = false;
    button.textContent = 'ابدأ التحقق';
  }

  renderReport(text, report, true);
}

$('verify').onclick = check;

$('paste').onclick = async () => {
  try {
    $('claim').value = await navigator.clipboard.readText();
  } catch {
    alert('استخدم الضغط المطوّل ثم لصق داخل الحقل.');
  }
};

$('api').value =
  localStorage.getItem(apiKey) || defaultApi;

$('saveApi').onclick = () => {
  const value = $('api').value.trim().replace(/\/+$/, '');

  if (value && !safeUrl(value)) {
    alert('أدخل رابط HTTPS صحيحاً.');
    return;
  }

  if (value) {
    localStorage.setItem(apiKey, value);
  } else {
    localStorage.removeItem(apiKey);
    $('api').value = defaultApi;
  }

  $('status').textContent = 'تم حفظ إعدادات الخادم.';
};

$('testApi').onclick = async () => {
  const url = (
    localStorage.getItem(apiKey) || defaultApi
  ).replace(/\/+$/, '');

  $('status').textContent = 'جارٍ اختبار الاتصال...';

  try {
    const response = await fetch(url + '/health');

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    $('status').textContent =
      'الخادم متصل: ' + JSON.stringify(data);

  } catch (error) {
    $('status').textContent =
      'تعذر الاتصال: ' + String(error.message || error);
  }
};

$('clear').onclick = () => {
  if (confirm('مسح جميع التقارير المحلية؟')) {
    localStorage.removeItem(storageKey);
    renderArchive();
  }
};

const params = new URLSearchParams(location.search);
const shared = params.get('text') || params.get('url');

if (shared) {
  $('claim').value = shared;
}

renderArchive();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
