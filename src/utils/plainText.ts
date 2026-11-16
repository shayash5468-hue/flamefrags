const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '−': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
};

function toSuperscript(str: string): string {
  if (str === '*') return '*';
  const chars = [...str];
  if (chars.every(c => SUPERSCRIPT_MAP[c] !== undefined)) {
    return chars.map(c => SUPERSCRIPT_MAP[c]).join('');
  }
  return `^${str}`;
}

function toSubscript(str: string): string {
  const chars = [...str];
  if (chars.every(c => SUBSCRIPT_MAP[c] !== undefined)) {
    return chars.map(c => SUBSCRIPT_MAP[c]).join('');
  }
  return `_${str}`;
}

function convertMathFragment(raw: string): string {
  let s = raw;

  // 1. Degree symbols before \text{C} unwrapping merges \circ with C
  s = s.replace(/\^\s*\{\s*\\circ\s*\}/g, '°');
  s = s.replace(/\^\s*\\circ(?![a-z])/g, '°');
  s = s.replace(/\\degree\b/g, '°');
  s = s.replace(/\\circ\b/g, '°');

  // 2. Unwrap \text{...}, \mathrm{...}, \mathbf{...}, etc.
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|mathsf|mathcal|operatorname)\s*\{([^{}]*)\}/g, '$1');
  }

  // 3. Common LaTeX symbol commands -> Unicode (use (?![a-zA-Z]) so _subscripts like \tau_flow still match)
  const replacements: [RegExp, string][] = [
    [/\\rightleftharpoons(?![a-zA-Z])/g, '⇌'],
    [/\\leftrightarrow(?![a-zA-Z])/g, '↔'],
    [/\\rightarrow(?![a-zA-Z])|\\to(?![a-zA-Z])/g, '→'],
    [/\\leftarrow(?![a-zA-Z])/g, '←'],
    [/\\approx(?![a-zA-Z])/g, '≈'],
    [/\\simeq(?![a-zA-Z])|\\cong(?![a-zA-Z])/g, '≃'],
    [/\\sim(?![a-zA-Z])/g, '~'],
    [/\\times(?![a-zA-Z])/g, '×'],
    [/\\cdot(?![a-zA-Z])/g, '·'],
    [/\\pm(?![a-zA-Z])/g, '±'],
    [/\\mp(?![a-zA-Z])/g, '∓'],
    [/\\leq(?![a-zA-Z])|\\le(?![a-zA-Z])/g, '≤'],
    [/\\geq(?![a-zA-Z])|\\ge(?![a-zA-Z])/g, '≥'],
    [/\\neq(?![a-zA-Z])|\\ne(?![a-zA-Z])/g, '≠'],
    [/\\propto(?![a-zA-Z])/g, '∝'],
    [/\\infty(?![a-zA-Z])/g, '∞'],
    [/\\partial(?![a-zA-Z])/g, '∂'],
    [/\\nabla(?![a-zA-Z])/g, '∇'],
    [/\\sum(?![a-zA-Z])/g, 'Σ'],
    [/\\prod(?![a-zA-Z])/g, 'Π'],
    [/\\int(?![a-zA-Z])/g, '∫'],
    [/\\Delta(?![a-zA-Z])/g, 'Δ'],
    [/\\delta(?![a-zA-Z])/g, 'δ'],
    [/\\alpha(?![a-zA-Z])/g, 'α'],
    [/\\beta(?![a-zA-Z])/g, 'β'],
    [/\\gamma(?![a-zA-Z])/g, 'γ'],
    [/\\theta(?![a-zA-Z])/g, 'θ'],
    [/\\lambda(?![a-zA-Z])/g, 'λ'],
    [/\\mu(?![a-zA-Z])/g, 'μ'],
    [/\\nu(?![a-zA-Z])/g, 'ν'],
    [/\\rho(?![a-zA-Z])/g, 'ρ'],
    [/\\sigma(?![a-zA-Z])/g, 'σ'],
    [/\\tau(?![a-zA-Z])/g, 'τ'],
    [/\\phi(?![a-zA-Z])|\\varphi(?![a-zA-Z])/g, 'φ'],
    [/\\omega(?![a-zA-Z])/g, 'ω'],
    [/\\Omega(?![a-zA-Z])/g, 'Ω'],
    [/\\eta(?![a-zA-Z])/g, 'η'],
    [/\\kappa(?![a-zA-Z])/g, 'κ'],
    [/\\epsilon(?![a-zA-Z])|\\varepsilon(?![a-zA-Z])/g, 'ε'],
    [/\\pi(?![a-zA-Z])/g, 'π'],
    [/\\left\s*([(\[{|])/g, '$1'],
    [/\\right\s*([)\]}|])/g, '$1'],
    [/\\[,;:!]/g, ' '],
    [/\\quad(?![a-zA-Z])|\\qquad(?![a-zA-Z])/g, ' '],
    [/\\%/g, '%'],
  ];

  for (const [pattern, rep] of replacements) {
    s = s.replace(pattern, rep);
  }

  // 4. Superscripts & subscripts (resolving nested braces before \frac / \sqrt)
  s = s.replace(/\^\s*\{([^{}]+)\}/g, (_m, inner) => toSuperscript(inner.trim()));
  s = s.replace(/\^([0-9*+-])/g, (_m, ch) => toSuperscript(ch));
  s = s.replace(/_\s*\{([^{}]+)\}/g, (_m, inner) => toSubscript(inner.trim()));
  s = s.replace(/_([0-9])/g, (_m, ch) => toSubscript(ch));

  // 5. \frac{a}{b} and \sqrt{x} (now free of inner subscript/text braces)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_m, a, b) => {
      const ca = a.trim();
      const cb = b.trim();
      const left = ca.includes(' ') || ca.includes('+') || ca.includes('-') ? `(${ca})` : ca;
      const right = cb.includes(' ') || cb.includes('+') || cb.includes('-') ? `(${cb})` : cb;
      return `${left}/${right}`;
    });
  }
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');

  // 6. Strip leftover LaTeX braces and unknown backslashes in math mode
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');
  s = s.replace(/[{}]/g, '');

  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Removes all LaTeX delimiters and commands ($...$, $$...$$, \(...\), \[...\],
 * \frac, \text, etc.) so scientific text renders as clean plain Unicode prose.
 */
export function stripLatex(input: string): string {
  if (!input) return input;
  let out = input;

  // 1. Block display math: $$...$$ and \[...\]
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => convertMathFragment(inner));
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => convertMathFragment(inner));

  // 2. Inline \(...\)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => convertMathFragment(inner));

  // 3. Inline $...$ (avoid matching plain currency like "$25 vs $50")
  out = out.replace(/\$([^\n$]{1,160}?)\$/g, (full, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return full;
    if (/^\d/.test(trimmed) && !/[\\^_=≈<>±×·⇌→°{}]/.test(trimmed)) {
      return full;
    }
    return convertMathFragment(trimmed);
  });

  // 4. Catch any stray LaTeX commands even outside $ delimiters
  if (/\\(?:frac|dfrac|text|mathrm|mathbf|approx|times|cdot|Delta|mu|rho|circ|rightleftharpoons|rightarrow|leq|geq|neq|pm|sqrt)/.test(out)) {
    out = convertMathFragment(out);
  }

  return out;
}

export function formatDataRow(row: Record<string, any>): string {
  if (!row || typeof row !== 'object') return String(row);
  const parts: string[] = [];
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = key
      .replace(/_/g, ' ')
      .replace(/\b[a-z]/g, c => c.toUpperCase());
    parts.push(`${cleanKey}: ${val}`);
  }
  return parts.join(' | ');
}

export function formatRawJsonInText(text: string): string {
  if (!text) return text;
  let out = text.replace(/\{([^}]+)\}/g, (match) => {
    try {
      const parsed = JSON.parse(match);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase())}: ${v}`)
          .join(' | ');
      }
    } catch {
      // ignore
    }
    return match;
  });
  return out;
}

