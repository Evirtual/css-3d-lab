export type Lang = 'html' | 'css' | 'scss' | 'js';

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const wrap = (cls: string, s: string): string => `<span class="t-${cls}">${s}</span>`;

// One combined regex per language, applied in a single pass so tokens never nest.
const RULES: Record<Lang, [RegExp, string[]]> = {
  html: [/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[\w-]+|\/?&gt;)|([\w-]+)(?==)|("[^"]*")/g, ['com', 'tag', 'attr', 'str']],
  css: [
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(@[\w-]+|\$[\w-]+)|(--[\w-]+)|([\w-]+)(?=\s*:\s[^{}]*?;)|(#[0-9a-fA-F]{3,8}\b|-?\b\d*\.?\d+(?:px|deg|s|ms|%|em|rem|turn|rad|vh|vw)?)/g,
    ['com', 'kw', 'var', 'prop', 'num'],
  ],
  scss: [/$^/g, []],
  js: [
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|for|of|new|document|window|Math)\b|\b(\d*\.?\d+)\b/g,
    ['com', 'str', 'kw', 'num'],
  ],
};
RULES.scss = RULES.css;

export function highlight(code: string, lang: Lang): string {
  const [re, classes] = RULES[lang];
  return escape(code).replace(re, (match, ...groups: unknown[]) => {
    const i = classes.findIndex((_, idx) => groups[idx] !== undefined);
    return i < 0 ? match : wrap(classes[i], match);
  });
}
