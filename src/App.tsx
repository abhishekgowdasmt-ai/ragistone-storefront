import { useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, Phone, X } from 'lucide-react'

const products = [
  { number: '01', category: 'IN THE KITCHEN', name: 'Vegetable cutting board', material: 'MDF', description: 'A simple starting point for everyday chopping and prep.', art: 'board' },
  { number: '02', category: 'KITCHEN FINDS', name: 'Kitchen accessories', material: 'THE LITTLE HELPERS', description: 'Useful details for the busiest corner of the home.', art: 'tools' },
  { number: '03', category: 'ON THE MOVE', name: 'GripSip bottle', material: 'STAINLESS STEEL', description: 'An everyday companion for commutes, errands and beyond.', art: 'bottle' },
  { number: '04', category: 'OUT WITH YOUR DOG', name: 'Pet waste picker', material: 'WALK ESSENTIAL', description: 'A practical pick for making daily walks a little easier.', art: 'picker' },
]

const contacts = [
  { name: 'Abhishek BG', phone: '+91 99011 10780' },
  { name: 'Chethan Kumar S', phone: '+91 87229 91408' },
  { name: 'Rajath M', phone: '+91 82779 11024' },
]

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <a className={small ? 'brand brand--small' : 'brand'} href="#top" aria-label="Ragistone home">
      <span className="brand__seal" aria-hidden="true">
        <svg viewBox="0 0 42 42" fill="none">
          <path d="M11 29.5c7.6-1.1 15.5-7.7 18-18.5-7.1 1.6-14.1 7.7-18 18.5Z" />
          <path d="M13 31c4.1-5 9-8.5 15.4-11.7M25.3 11.8c2.1 1.5 3.8 3.4 5 5.6" />
          <path d="M10.5 32.5h22" />
        </svg>
      </span>
      <span className="brand__word">RAGISTONE</span>
    </a>
  )
}

function ProductArt({ type }: { type: string }) {
  if (type === 'board') return (
    <svg className="product-art product-art--board" viewBox="0 0 380 300" role="img" aria-label="Illustration of a wood-toned vegetable cutting board">
      <ellipse cx="192" cy="255" rx="136" ry="20" fill="#9d805a" opacity=".13" />
      <g transform="rotate(-8 190 170)">
        <rect x="70" y="92" width="238" height="146" rx="28" fill="#b27d4b" />
        <rect x="80" y="101" width="218" height="126" rx="23" fill="#e7c99c" />
        <path d="M101 134c47 5 96-3 151-21M111 158c44 3 107-3 167-21M119 186c56 3 99-3 151-19" stroke="#d2ad7d" strokeWidth="2" opacity=".52" />
        <rect x="172" y="113" width="33" height="5" rx="2.5" fill="#b3895f" opacity=".58" />
      </g>
      <circle cx="275" cy="111" r="17" fill="#cf6e4e" /><circle cx="302" cy="129" r="14" fill="#de8d58" /><circle cx="262" cy="139" r="13" fill="#b75542" />
      <path d="M275 95c-1-8 4-12 9-12M302 115c0-6 4-9 9-10M262 126c-1-6 3-9 7-11" stroke="#64764d" strokeWidth="3" strokeLinecap="round" />
      <path d="M90 254c12-13 17-26 16-39M110 260c11-12 17-24 18-36" stroke="#708051" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="91" cy="232" rx="8" ry="14" transform="rotate(-38 91 232)" fill="#879769" /><ellipse cx="117" cy="244" rx="7" ry="13" transform="rotate(34 117 244)" fill="#a3ae78" />
    </svg>
  )
  if (type === 'tools') return (
    <svg className="product-art product-art--tools" viewBox="0 0 380 300" role="img" aria-label="Illustration of kitchen utensils">
      <ellipse cx="192" cy="260" rx="133" ry="17" fill="#7e735a" opacity=".12" />
      <g transform="rotate(-17 126 153)"><rect x="113" y="131" width="18" height="116" rx="9" fill="#aa7950" /><path d="M121.5 128v-64m-12 4c-7 17-7 36 12 43m12-43c7 17 7 36-12 43m-6-38v34m12-34v34" stroke="#d6a85f" strokeWidth="5" strokeLinecap="round" /></g>
      <g transform="rotate(12 206 158)"><rect x="197" y="137" width="18" height="111" rx="9" fill="#a77951" /><path d="M206 131c-14 0-24-10-24-23s10-24 24-24 24 11 24 24-10 23-24 23Zm-13-37 26 27m-26 0 26-27m-13-10v40m-19-20h38" stroke="#858c76" strokeWidth="4" strokeLinecap="round" /></g>
      <g transform="rotate(27 267 155)"><rect x="259" y="122" width="16" height="126" rx="8" fill="#aa7950" /><path d="m267 67 19 52h-38l19-52Z" fill="#e0d5bd" stroke="#8b8c7b" strokeWidth="4" strokeLinejoin="round" /><path d="M267 77v33m-10-22 10 3m10-3-10 3" stroke="#929381" strokeWidth="3" strokeLinecap="round" /></g>
      <path d="M104 249h174" stroke="#857d69" strokeWidth="2" opacity=".4" />
    </svg>
  )
  if (type === 'bottle') return (
    <svg className="product-art product-art--bottle" viewBox="0 0 380 300" role="img" aria-label="Illustration of a stainless steel bottle">
      <ellipse cx="191" cy="258" rx="76" ry="17" fill="#6b7665" opacity=".15" />
      <path d="M171 60c0-10 8-18 18-18h8c10 0 18 8 18 18v25h-44V60Z" fill="#a7aaa1" />
      <path d="M161 84h64c8 0 14 6 14 14v117c0 24-19 43-43 43h-6c-24 0-43-19-43-43V98c0-8 6-14 14-14Z" fill="url(#steel)" stroke="#858b83" strokeWidth="3" />
      <path d="M168 97v114c0 17 10 28 20 32" stroke="#fffdf7" strokeWidth="8" strokeLinecap="round" opacity=".68" />
      <path d="M158 111h70M168 71h43m-43-9h43" stroke="#777f77" strokeWidth="3" strokeLinecap="round" opacity=".5" />
      <path d="M188 150c11-14 28-15 38-3" stroke="#8f9b7a" strokeWidth="3" strokeLinecap="round" opacity=".75" />
      <defs><linearGradient id="steel" x1="154" y1="117" x2="239" y2="171" gradientUnits="userSpaceOnUse"><stop stopColor="#d9d9d0" /><stop offset=".28" stopColor="#f7f4e9" /><stop offset=".54" stopColor="#b3b8b2" /><stop offset=".78" stopColor="#e9e5d8" /><stop offset="1" stopColor="#b7b8ae" /></linearGradient></defs>
    </svg>
  )
  return (
    <svg className="product-art product-art--picker" viewBox="0 0 380 300" role="img" aria-label="Illustration of a pet waste picker">
      <ellipse cx="188" cy="257" rx="132" ry="16" fill="#81765e" opacity=".13" />
      <path d="M139 88c0-8 6-14 14-14h11c8 0 14 6 14 14v109h-39V88Z" fill="#7d8b60" />
      <path d="M155 195v36m-8-5-15 19m31-19 15 19" stroke="#65714f" strokeWidth="9" strokeLinecap="round" />
      <path d="M150 78V55c0-8 6-14 14-14h53c8 0 14 6 14 14v17" fill="none" stroke="#8b6e4b" strokeWidth="11" strokeLinecap="round" />
      <path d="M215 58v54m0-2c0 16 15 20 15 35m0 0c-14 6-24 21-25 39m25-39c14 6 24 21 25 39" fill="none" stroke="#8b6e4b" strokeWidth="7" strokeLinecap="round" />
      <circle cx="230" cy="144" r="11" fill="#d89d68" /><path d="M260 112c0-13 10-23 23-23s23 10 23 23c0 17-23 34-23 34s-23-17-23-34Z" fill="#c98260" />
      <circle cx="283" cy="112" r="8" fill="#f6e7d5" />
    </svg>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  return (
    <div id="top" className="site-shell">
      <div className="announcement"><span>A new collection is taking shape</span><span className="announcement__dot">✳</span><span>Everyday, a little more considered</span></div>
      <header className="site-header">
        <div className="header-inner">
          <BrandMark />
          <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          <nav className={menuOpen ? 'main-nav main-nav--open' : 'main-nav'} aria-label="Main navigation">
            <a href="#collection" onClick={closeMenu}>The collection</a><a href="#everyday" onClick={closeMenu}>Everyday notes</a><a href="#story" onClick={closeMenu}>Our approach</a>
          </nav>
          <a className="header-cta" href="#collection">Discover Ragistone <ArrowUpRight size={15} strokeWidth={1.8} /></a>
        </div>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero__image" /><div className="hero__veil" />
          <div className="hero__content"><p className="eyebrow"><span className="eyebrow__line" /> Meet Ragistone</p><h1 id="hero-heading">Everyday essentials,<br /><em>a little more</em><br />considered.</h1><p className="hero__copy">Useful finds for the places and routines that make a home feel like yours.</p><a className="button button--dark" href="#collection">Explore the first collection <ArrowRight size={17} /></a></div>
          <div className="hero__caption"><span>THE RAGISTONE EDIT</span><span>01 / HOME · KITCHEN · PET</span></div>
          <a href="#collection" className="hero__scroll" aria-label="Scroll to the collection"><span>Scroll to discover</span><ArrowDownRight size={17} /></a>
        </section>
        <div className="ticker" aria-label="Ragistone product categories"><div className="ticker__track">{[0, 1].map((copy) => <div className="ticker__set" aria-hidden={copy === 1} key={copy}><span>For the kitchen</span><i>✳</i><span>For the everyday</span><i>✳</i><span>For life on the move</span><i>✳</i><span>For your four-legged friend</span><i>✳</i></div>)}</div></div>

        <section className="collection section-wrap" id="collection">
          <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__line" /> The opening edit</p><h2>A few good things<br /><em>for everyday living.</em></h2></div><p className="section-heading__note">From prep time to pet time, meet the first pieces in our growing collection.</p></div>
          <div className="product-grid">{products.map((product) => <article className="product-card" key={product.number}>
            <div className={'product-card__visual product-card__visual--' + product.art}><span className="product-card__number">{product.number}</span><span className="coming-soon">Coming soon</span><ProductArt type={product.art} /><div className="product-card__plus" aria-hidden="true">+</div></div>
            <div className="product-card__meta"><span>{product.category}</span><span>{product.material}</span></div><h3>{product.name}</h3><p>{product.description}</p>
          </article>)}</div>
          <div className="collection-foot"><span>THE FIRST RAGISTONE COLLECTION</span><a href="#story">A little more about us <ArrowUpRight size={15} /></a></div>
        </section>

        <section className="everyday" id="everyday"><div className="everyday__inner section-wrap">
          <div className="everyday__intro"><p className="eyebrow"><span className="eyebrow__line" /> The everyday edit</p><h2>Good things find<br />their <em>own little place.</em></h2><p className="everyday__copy">A collection that moves through the day with you — from the first meal to the last walk.</p></div>
          <div className="rituals">
            <article className="ritual"><span className="ritual__number">01</span><div className="ritual__icon ritual__icon--prep" aria-hidden="true"><span /><span /><span /></div><div><h3>At the counter</h3><p>A little more ease for the daily rhythm of the kitchen.</p></div><ArrowUpRight className="ritual__arrow" size={18} /></article>
            <article className="ritual"><span className="ritual__number">02</span><div className="ritual__icon ritual__icon--carry" aria-hidden="true"><span /></div><div><h3>On the way</h3><p>Simple companions for busy days and changing plans.</p></div><ArrowUpRight className="ritual__arrow" size={18} /></article>
            <article className="ritual"><span className="ritual__number">03</span><div className="ritual__icon ritual__icon--care" aria-hidden="true"><span /></div><div><h3>Out together</h3><p>Practical picks for all the small adventures with your dog.</p></div><ArrowUpRight className="ritual__arrow" size={18} /></article>
          </div>
        </div></section>

        <section className="story section-wrap" id="story">
          <div className="story__image"><div className="story__image-text"><span>THE LITTLE THINGS</span><span>THAT MAKE A HOME</span></div></div>
          <div className="story__content"><p className="eyebrow"><span className="eyebrow__line" /> A note from Ragistone</p><h2>For the useful,<br /><em>the lived-in,</em><br />the loved.</h2><p>Home is made in the everyday: chopping something fresh, filling a bottle before you head out, and taking the long way around the block.</p><p>Ragistone is building a collection for those real routines. A few useful things, chosen with care, for the people and pets who make a house feel like home.</p><a className="text-link" href="#collection">Come see what’s taking shape <ArrowRight size={17} /></a></div>
        </section>
        <section className="closing"><div className="closing__pattern" aria-hidden="true" /><p className="eyebrow"><span className="eyebrow__line" /> A new everyday, taking shape</p><h2>Stay a little<br /><em>curious.</em></h2><a className="button button--light" href="#collection">See the opening edit <ArrowUpRight size={16} /></a><span className="closing__stamp">R<br /><i>✳</i></span></section>
      </main>
      <footer className="site-footer">
        <section className="footer-contact" id="contact" aria-labelledby="contact-heading">
          <div><p className="eyebrow"><span className="eyebrow__line" /> Contact us</p><h2 id="contact-heading" className="footer-contact__title">Say hello, <em>anytime.</em></h2></div>
          <ul className="footer-contact__list">{contacts.map((contact) => <li key={contact.phone}>
            <span className="footer-contact__name">{contact.name}</span>
            <a className="footer-contact__phone" href={'tel:' + contact.phone.replace(/\s/g, '')} aria-label={'Call ' + contact.name + ' on ' + contact.phone}><Phone size={12} strokeWidth={1.8} aria-hidden="true" />{contact.phone}</a>
          </li>)}</ul>
        </section>
        <div className="footer-top">
        <div><BrandMark small /><p className="footer-tagline">Everyday, in good company.</p></div>
        <div className="footer-links"><div><span>EXPLORE</span><a href="#collection">The collection</a><a href="#everyday">Everyday notes</a></div><div><span>RAGISTONE</span><a href="#story">Our approach</a><a href="#top">Back to the top</a></div><div><span>THE FIRST EDIT</span><p>Kitchen · Home · Pet</p><p>More taking shape.</p></div></div>
        <a className="back-top" href="#top" aria-label="Back to top">↑</a>
      </div><div className="footer-bottom"><span>© 2026 RAGISTONE</span><span>MADE FOR THE EVERYDAY</span><a href="#top">India <span>↗</span></a></div></footer>
    </div>
  )
}
export default App
