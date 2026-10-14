import wordmark from '../brand/logo/wordmark.svg';

/** The Scrape wordmark. It sizes from the surrounding font size, like the
 *  lettering it replaced, so 1em sets it as DynaPuff at that size. Pass an
 *  empty label where a parent already names it. */
export function Wordmark({ label = 'Scrape' }: { label?: string }) {
  return <img className="wordmark-art" src={wordmark} alt={label}/>;
}
