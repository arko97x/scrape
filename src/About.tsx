import { Modal } from './Modal';
import { Wordmark } from './Wordmark';
import './modal.css';

export function About({ onClose, onWelcome }: { onClose: () => void; onWelcome: () => void }) {
  return <Modal id="about-scrape" label="About Scrape" className="about" title={<span className="modal-mark"><Wordmark/></span>} onClose={onClose}>
    <p className="about-intro">A little paint playground for squeezing, scraping and happy accidents.</p>
    <section className="about-section">
      <h2>Why it exists</h2>
      <p>I love watching scrape paintings come together. A few blobs of acrylic, one long pull of a card, and the colours fold into each other in ways nobody could plan. Real paint is messy and costly, and a finished canvas starts to feel precious. I wanted that same pull without any of that: a place where anyone, small or grown, can make something in a minute and then start again.</p>
    </section>
    <section className="about-section">
      <h2>Made by</h2>
      <p><a href="https://www.arccc.co" target="_blank" rel="noopener">Arkoprabho Bhattacharjee</a></p>
    </section>
    <section className="about-section">
      <h2>With real paint</h2>
      <p>Two short guides: <a href="/scrape-painting/">how to do scrape painting</a>, and <a href="/squeegee-painting/">squeegee painting with kids</a>. And a <a href="/gallery/">gallery</a> of paintings made here, with how each was done.</p>
    </section>
    <section className="about-section">
      <h2>Colophon</h2>
      <dl className="colophon">
        <div><dt>Paint</dt><dd>A 480 × 600 grid of wet paint, simulated on your device and lit with WebGL 2. It approximates acrylic and is tuned by eye.</dd></div>
        <div><dt>Mixing</dt><dd><a href="https://scrtwpns.com/mixbox" target="_blank" rel="noreferrer">Mixbox</a>, © Secret Weapons, under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">CC BY-NC 4.0</a>. Scrape is non-commercial.</dd></div>
        <div><dt>Type</dt><dd>DynaPuff and Nunito, from Google Fonts.</dd></div>
        <div><dt>Built with</dt><dd>React, Vite and Lucide icons.</dd></div>
        <div><dt>Your painting</dt><dd>Your current painting stays in this browser. A copy is uploaded only when you choose to publish it to the gallery.</dd></div>
      </dl>
    </section>
    <footer className="modal-actions">
      <button className="modal-secondary" onClick={onWelcome}>How it works</button>
      <button className="modal-primary" data-autofocus onClick={onClose}>Back to painting</button>
    </footer>
  </Modal>;
}
