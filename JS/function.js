const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-navigation');
const siteHeader = document.querySelector('.site-header');
const experience = document.querySelector('#experience');
const aboutLink = document.querySelector('.about .text-link');
const focusList = document.querySelector('.hero aside ul');
const writingLink = document.querySelector('#writing > .text-link');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionEnabled = !reducedMotionQuery.matches;

let revealObserver = null;

if (motionEnabled) {
  document.documentElement.classList.add('motion-ready');

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10%', threshold: 0.08 });
  }
}

const observeReveals = (elements, stagger = 0, immediate = false) => {
  if (!motionEnabled) return;

  [...elements].forEach((element, index) => {
    element.classList.add('reveal');
    element.style.setProperty('--motion-delay', `${index * stagger}ms`);

    if (immediate) {
      requestAnimationFrame(() => element.classList.add('is-visible'));
    } else if (revealObserver) {
      revealObserver.observe(element);
    } else {
      element.classList.add('is-visible');
    }
  });
};

observeReveals(document.querySelectorAll('.hero > div > *, .hero aside'), 55, true);
observeReveals(document.querySelectorAll('main > .section:not(.hero)'), 0);
observeReveals(document.querySelectorAll('.about-grid > *, .cards article, .experience-list article, #capabilities .capabilities article'), 45);

const heroTitle = document.querySelector('.hero h1');
const scrambleAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const scrambleHeroTitle = () => {
  if (!motionEnabled || !heroTitle) return;

  const textNodes = [...heroTitle.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  const originalText = textNodes.map((node) => node.textContent);
  const letterCount = originalText.join('').replace(/[^a-z]/gi, '').length;
  const duration = 460;
  let startTime = null;

  if (!letterCount) return;

  const animate = (timestamp) => {
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const resolvedLetters = Math.floor(letterCount * progress);
    const scrambleStep = Math.floor(elapsed / 45);
    let currentLetter = 0;

    textNodes.forEach((node, nodeIndex) => {
      node.textContent = [...originalText[nodeIndex]].map((character) => {
        if (!/[a-z]/i.test(character)) return character;
        currentLetter += 1;
        if (currentLetter <= resolvedLetters) return character;
        const scrambledCharacter = scrambleAlphabet[(currentLetter * 5 + scrambleStep) % scrambleAlphabet.length];
        return character === character.toUpperCase() ? scrambledCharacter : scrambledCharacter.toLowerCase();
      }).join('');
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      textNodes.forEach((node, nodeIndex) => { node.textContent = originalText[nodeIndex]; });
    }
  };

  requestAnimationFrame(animate);
};

scrambleHeroTitle();

if (aboutLink) aboutLink.style.marginLeft = '0';
if (focusList) focusList.style.paddingLeft = '1.1rem';
if (writingLink) writingLink.style.marginLeft = '0';

if (siteHeader) {
  siteHeader.style.position = 'sticky';
  siteHeader.style.top = '0';
  siteHeader.style.zIndex = '100';
  siteHeader.style.background = 'var(--paper)';
  siteHeader.style.maxWidth = 'none';
  siteHeader.style.marginLeft = '0';
  siteHeader.style.marginRight = '0';
  siteHeader.style.paddingLeft = 'max(4vw, calc((100vw - 1280px) / 2 + 4vw))';
  siteHeader.style.paddingRight = 'max(4vw, calc((100vw - 1280px) / 2 + 4vw))';
}

if (experience) {
  experience.style.maxWidth = 'none';
  experience.style.marginLeft = '0';
  experience.style.marginRight = '0';
  experience.style.paddingLeft = 'max(4vw, calc((100vw - 1280px) / 2 + 4vw))';
  experience.style.paddingRight = 'max(4vw, calc((100vw - 1280px) / 2 + 4vw))';
  experience.querySelectorAll('.company-meta').forEach((meta) => {
    meta.style.display = 'flex';
    meta.style.alignItems = 'center';
    meta.style.gap = '.65rem';
    meta.style.margin = '.75rem 0';
    meta.querySelector('img').style.borderRadius = '6px';
  });
  const hiringTitle = experience.querySelector('article:last-child h3');
  if (hiringTitle) {
    hiringTitle.style.fontFamily = 'Fraunces, serif';
    hiringTitle.style.fontSize = 'clamp(1.8rem, 3vw, 2.7rem)';
  }
}

const footer = document.querySelector('footer');
if (footer) {
  const copyright = document.createElement('span');
  copyright.innerHTML = '© <span id="current-year"></span> Fateen Najib Indramustika';
  footer.textContent = '';
  footer.style.display = 'flex';
  footer.style.alignItems = 'center';
  footer.style.justifyContent = 'space-between';
  footer.style.gap = '1rem';
  footer.append(copyright);
  footer.insertAdjacentHTML('beforeend', `
    <nav aria-label="Social profiles" style="display:flex;gap:1rem;align-items:center">
      <a href="https://github.com/Teenjb" target="_blank" rel="noreferrer" aria-label="Fateen on GitHub" style="display:inline-flex" viewBox="0 0 24 24"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49v-1.87c-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.54 1.06 1.54 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.4c.85 0 1.7.12 2.5.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg></a>
      <a href="https://www.linkedin.com/in/fateen-indramustika-109355175/" target="_blank" rel="noreferrer" aria-label="Fateen on LinkedIn" style="display:inline-flex"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.33V8.99h3.42v1.57h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.31 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.52V8.99h3.57v11.46Z"/></svg></a>
      <a href="https://www.instagram.com/fateen.njb/" target="_blank" rel="noreferrer" aria-label="Fateen on Instagram" style="display:inline-flex"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
    </nav>`);
}

menuButton?.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.classList.toggle('is-open', open);
  siteHeader?.classList.toggle('menu-open', open);
});

document.querySelectorAll('#site-navigation a').forEach((link) => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.classList.remove('is-open');
  siteHeader?.classList.remove('menu-open');
}));

document.querySelector('#current-year').textContent = new Date().getFullYear();

const posts = document.querySelector('#medium-posts');
const formatDate = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });

fetch('data/medium-posts.json')
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(({ articles = [] }) => {
    if (!articles.length) throw new Error('No articles');
    posts.innerHTML = articles.map(({ title, url, publishedAt, categories = [], excerpt }) => `
      <article class="post">
        <time datetime="${publishedAt}">${formatDate.format(new Date(publishedAt))}</time>
        <div><h3><a href="${url}" target="_blank" rel="noreferrer">${title}</a></h3><p>${excerpt || categories.join(' · ')}</p></div>
        <a href="${url}" target="_blank" rel="noreferrer" aria-label="Read ${title} on Medium">Read ↗︎</a>
      </article>`).join('');
    observeReveals(posts.querySelectorAll('.post'), 45);
  })
  .catch(() => { posts.innerHTML = '<p>Latest articles are available on <a href="https://medium.com/@fateennjb.i" target="_blank" rel="noreferrer">Medium ↗︎</a>.</p>'; });
