export const THEME_STORAGE_KEY = 'theme';
export type Theme = 'light' | 'dark';

/**
 * Inlined in <head> so the page never flashes the wrong theme.
 * A stored choice wins; otherwise the OS preference.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;
