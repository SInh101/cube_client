import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  fileURLToPath(new URL('./face-controls.css', import.meta.url)),
  'utf8',
);
const globalStyles = readFileSync(
  fileURLToPath(new URL('../styles.css', import.meta.url)),
  'utf8',
);

describe('desktop workspace layout', () => {
  it('Cube View側を維持し、操作カラムだけをscrollする', () => {
    expect(styles).toMatch(/\.cube-workspace\s*\{[^}]*overflow:\s*hidden/su);
    expect(styles).toMatch(/\.cube-controls\s*\{[^}]*overflow-y:\s*auto/su);
  });

  it('狭い画面では一列のpage scrollへ戻す', () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*90rem\)[\s\S]*\.cube-controls\s*\{[^}]*overflow-y:\s*visible/u,
    );
  });

  it('desktopではpage全体のscrollを発生させない', () => {
    expect(globalStyles).toMatch(
      /@media \(min-width:\s*90\.001rem\)[\s\S]*body\s*\{[^}]*overflow:\s*hidden/u,
    );
    expect(globalStyles).toMatch(/main\s*\{[^}]*height:\s*100dvh/su);
  });

  it('右カラムに横scrollが必要になる前に一列へ切り替える', () => {
    expect(styles).toMatch(/\.cube-controls\s*\{[^}]*overflow-x:\s*hidden/su);
    expect(globalStyles).toMatch(
      /main\s*\{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100%/su,
    );
  });

  it('広い画面では右カラム幅を広く取り、操作カードをtrack内へ縮める', () => {
    expect(globalStyles).toMatch(/main\s*\{[^}]*max-width:\s*96rem/su);
    expect(styles).toMatch(
      /\.face-control-panel\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/su,
    );
    expect(styles).toMatch(
      /\.cube-controls\s*\{[^}]*box-sizing:\s*border-box/su,
    );
  });
  it('keeps each face card inside a single-column control panel', () => {
    expect(styles).toMatch(
      /\.face-control\s*\{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100%;[^}]*min-width:\s*0;/su,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*30rem\)[\s\S]*?\.face-control\s*\{[^}]*grid-template-columns:\s*2rem minmax\(0, 1fr\) 2rem;/u,
    );
  });

  it('divides every face icon into nine equal cells', () => {
    expect(styles).toMatch(
      /\.face-control__layer\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);[^}]*grid-template-rows:\s*repeat\(3, minmax\(0, 1fr\)\);/su,
    );
  });
});
