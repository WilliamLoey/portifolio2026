import { LOCALES } from '@portfolio/contracts';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
}

const load = (locale: string) =>
  JSON.parse(readFileSync(path.join(__dirname, '../../messages', `${locale}.json`), 'utf8')) as Tree;

describe('UI translations', () => {
  const english = keys(load('en')).sort();

  it.each(LOCALES.filter((l) => l !== 'en'))('%s has exactly the English keys', (locale) => {
    const translated = keys(load(locale)).sort();
    expect(translated.filter((k) => !english.includes(k))).toEqual([]); // no stale keys
    expect(english.filter((k) => !translated.includes(k))).toEqual([]); // nothing missing
  });

  it.each(LOCALES)('%s has no empty strings', (locale) => {
    const tree = load(locale);
    const empty = keys(tree).filter((k) => k.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, tree) === '');
    expect(empty).toEqual([]);
  });

  it('defines an error message for every contact validation rule', () => {
    for (const rule of ['name.min', 'name.max', 'email.invalid', 'email.max', 'subject.min', 'subject.max', 'message.min', 'message.max']) {
      expect(english).toContain(`contact.errors.${rule}`);
    }
  });
});
