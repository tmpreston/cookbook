(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function roundTo(value, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  function formatValue(value) {
    if (value >= 100) return Math.round(value).toString();
    if (value >= 10)  return roundTo(value, 1).toString();
    return roundTo(value, 2).toString();
  }

  // Parse simple fractions ("1/2") and mixed numbers ("1 1/2") into a float.
  function parseFraction(str) {
    str = str.trim();
    var mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
    var frac = str.match(/^(\d+)\/(\d+)$/);
    if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
    return parseFloat(str);
  }

  // ── Conversion rule sets ──────────────────────────────────────────────────
  // Each rule: { regex, convert(match, ...groups) → string }

  var metricToImperial = [
    {
      // kg → lbs
      regex: /\b(\d+(?:\.\d+)?)\s*kg\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 2.20462) + ' lbs'; }
    },
    {
      // g / gm / gram(s) → oz or lbs for larger quantities
      regex: /\b(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams)\b/gi,
      convert: function (m, n) {
        var v = parseFloat(n);
        if (v >= 450) return formatValue(v / 453.592) + ' lbs';
        return formatValue(v * 0.035274) + ' oz';
      }
    },
    {
      // L / litre(s) / liter(s) (British and American spellings) → cups
      regex: /\b(\d+(?:\.\d+)?)\s*(?:L|litres?|liters?)\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 1000 / 236.588) + ' cups'; }
    },
    {
      // ml / mL range (e.g. "330 - 375 ml") → cups or fl oz
      regex: /\b(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*m[lL]\b/gi,
      convert: function (m, n1, n2) {
        var v1 = parseFloat(n1), v2 = parseFloat(n2);
        var maxV = Math.max(v1, v2);
        var unit = maxV >= 118 ? 'cups' : 'fl oz';
        var factor = unit === 'cups' ? 1 / 236.588 : 0.033814;
        return formatValue(v1 * factor) + ' - ' + formatValue(v2 * factor) + ' ' + unit;
      }
    },
    {
      // ml / mL single value → cups (≥ 118 ml) or fl oz
      regex: /\b(\d+(?:\.\d+)?)\s*m[lL]\b/gi,
      convert: function (m, n) {
        var v = parseFloat(n);
        if (v >= 118) return formatValue(v / 236.588) + ' cups';
        return formatValue(v * 0.033814) + ' fl oz';
      }
    },
    {
      // °C → °F
      regex: /\b(\d+(?:\.\d+)?)°C\b/g,
      convert: function (m, n) { return formatValue(parseFloat(n) * 9 / 5 + 32) + '°F'; }
    },
    {
      // deg C → deg F  (e.g. "180 deg C")
      regex: /\b(\d+(?:\.\d+)?)\s*deg\s*C\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 9 / 5 + 32) + ' deg F'; }
    },
    {
      // cm → in
      regex: /\b(\d+(?:\.\d+)?)\s*cm\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) / 2.54) + ' in'; }
    }
  ];

  var imperialToMetric = [
    {
      // lbs / lb / pounds → kg
      regex: /\b(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 0.453592) + ' kg'; }
    },
    {
      // fl oz / fluid ounces → ml  (must come before the plain 'oz' rule below)
      regex: /\b(\d+(?:\.\d+)?)\s*fl\.?\s*oz\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 29.5735) + ' ml'; }
    },
    {
      // oz (plain, not fl oz — the fl oz rule above already handled those) → g
      // The plain-oz regex requires the number to be immediately adjacent to 'oz'
      // with only optional whitespace, so it will not match 'fl oz'.
      regex: /\b(\d+(?:\.\d+)?)\s*oz\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 28.3495) + ' g'; }
    },
    {
      // cups (including fractions) → ml
      regex: /\b(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?)\s*cups?\b/gi,
      convert: function (m, n) { return formatValue(parseFraction(n) * 236.588) + ' ml'; }
    },
    {
      // tsp / teaspoon(s) (including fractions) → ml
      regex: /\b(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?)\s*(?:tsp|teaspoons?)\b/gi,
      convert: function (m, n) { return formatValue(parseFraction(n) * 4.92892) + ' ml'; }
    },
    {
      // tbsp / tbl / tlb / tablespoon(s) (including fractions) → ml
      regex: /\b(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?)\s*(?:tbsp|tbl|tlb|tablespoons?)\b/gi,
      convert: function (m, n) { return formatValue(parseFraction(n) * 14.7868) + ' ml'; }
    },
    {
      // °F → °C
      regex: /\b(\d+(?:\.\d+)?)°F\b/g,
      convert: function (m, n) { return formatValue((parseFloat(n) - 32) * 5 / 9) + '°C'; }
    },
    {
      // deg F → deg C
      regex: /\b(\d+(?:\.\d+)?)\s*deg\s*F\b/gi,
      convert: function (m, n) { return formatValue((parseFloat(n) - 32) * 5 / 9) + ' deg C'; }
    },
    {
      // inches / in → cm
      regex: /\b(\d+(?:\.\d+)?)\s*(?:inches|inch|in)\b/gi,
      convert: function (m, n) { return formatValue(parseFloat(n) * 2.54) + ' cm'; }
    }
  ];

  // ── DOM helpers ──────────────────────────────────────────────────────────

  function applyConversions(text, rules) {
    rules.forEach(function (rule) {
      // Reset lastIndex so repeated calls work correctly with /g flag
      rule.regex.lastIndex = 0;
      text = text.replace(rule.regex, rule.convert);
    });
    return text;
  }

  // ── Core state ────────────────────────────────────────────────────────────

  var stored = []; // { el, original } pairs

  function collectElements() {
    var content = document.querySelector('.content');
    if (!content) return;
    stored = [];
    var nodes = content.querySelectorAll('li, p, h1, h2, h3, h4, h5, h6, td');
    nodes.forEach(function (el) {
      stored.push({ el: el, original: el.innerHTML });
    });
  }

  function applyUnit(unit) {
    stored.forEach(function (item) {
      if (unit === 'imperial') {
        // Convert metric units found in the original source to their imperial equivalents.
        item.el.innerHTML = applyConversions(item.original, metricToImperial);
      } else {
        // Restore the original source values, converting any embedded imperial units to
        // metric so that recipes authored with imperial measurements display in metric.
        // Original metric values are left unchanged (no matching rule applies to them).
        //
        // Note: item.original is sourced from the static site's own markup (Hugo-rendered
        // Markdown) and is not user-supplied, so innerHTML assignment is safe here.
        item.el.innerHTML = applyConversions(item.original, imperialToMetric);
      }
    });
  }

  function savePreference(unit) {
    try { localStorage.setItem('unitPreference', unit); } catch (e) { /* ignore */ }
  }

  function loadPreference() {
    try { return localStorage.getItem('unitPreference') || 'metric'; } catch (e) { return 'metric'; }
  }

  function updateToggleUI(unit) {
    var metricBtn   = document.getElementById('unit-metric-btn');
    var imperialBtn = document.getElementById('unit-imperial-btn');
    if (!metricBtn || !imperialBtn) return;

    if (unit === 'imperial') {
      metricBtn.classList.remove('is-selected', 'is-primary');
      metricBtn.classList.add('is-light');
      imperialBtn.classList.remove('is-light');
      imperialBtn.classList.add('is-selected', 'is-primary');
    } else {
      imperialBtn.classList.remove('is-selected', 'is-primary');
      imperialBtn.classList.add('is-light');
      metricBtn.classList.remove('is-light');
      metricBtn.classList.add('is-selected', 'is-primary');
    }
  }

  function setUnit(unit) {
    applyUnit(unit);
    savePreference(unit);
    updateToggleUI(unit);
  }

  // ── Initialise ────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var metricBtn   = document.getElementById('unit-metric-btn');
    var imperialBtn = document.getElementById('unit-imperial-btn');

    // Only activate on pages that have the toggle buttons
    if (!metricBtn && !imperialBtn) return;

    collectElements();

    var pref = loadPreference();
    applyUnit(pref);
    updateToggleUI(pref);

    if (metricBtn) {
      metricBtn.addEventListener('click', function () { setUnit('metric'); });
    }
    if (imperialBtn) {
      imperialBtn.addEventListener('click', function () { setUnit('imperial'); });
    }
  });

}());
