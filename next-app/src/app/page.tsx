import Link from "next/link";

const highlights = [
  { number: "01", title: "Share what you know", detail: "Offer a skill you have practiced and help someone else grow." },
  { number: "02", title: "Learn what you need", detail: "Find people with complementary skills and clear learning goals." },
  { number: "03", title: "Grow together", detail: "Arrange an exchange, meet, and build trust through completed sessions." }
];

export default function HomePage() {
  return (
    <main>
      <nav className="nav wrap" aria-label="Main navigation">
        <Link className="brand" href="/">skill<span>barter</span></Link>
        <div className="navActions">
          <Link className="navLink" href="/login">Log in</Link>
          <Link className="button buttonSmall" href="/signup">Get started <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>
      <section className="hero wrap">
        <div className="heroCopy">
          <p className="eyebrow"><span className="eyebrowDot" /> A community built on shared skills</p>
          <h1>Your skills are<br />someone else’s <em>next step.</em></h1>
          <p className="heroText">Trade knowledge, meet curious people, and make progress together. No price tags on learning—just skills shared both ways.</p>
          <div className="heroActions">
            <Link className="button" href="/signup">Start exchanging <span aria-hidden="true">↗</span></Link>
            <Link className="textLink" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></Link>
          </div>
          <div className="trustLine"><span className="avatarStack"><i>V</i><i>A</i><i>M</i></span><span>Learn from people. Share what you know.</span></div>
        </div>
        <div className="heroVisual" aria-label="Illustration of skills being exchanged">
          <div className="orbit orbitOuter" />
          <div className="orbit orbitInner" />
          <div className="centerMark"><span>↔</span><small>SKILL<br />EXCHANGE</small></div>
          <div className="skillCard skillCardTop"><span className="skillIcon purple">✳</span><div><b>UI Design</b><small>Can teach</small></div><span className="cardArrow">↗</span></div>
          <div className="skillCard skillCardRight"><span className="skillIcon yellow">⌘</span><div><b>Python</b><small>Wants to learn</small></div><span className="cardArrow">↗</span></div>
          <div className="skillCard skillCardBottom"><span className="skillIcon green">✎</span><div><b>Public speaking</b><small>Skill shared</small></div><span className="cardArrow">↗</span></div>
          <div className="spark sparkOne">✳</div><div className="spark sparkTwo">✦</div>
        </div>
      </section>
      <section className="how wrap" id="how-it-works">
        <div className="sectionHeading"><p className="eyebrow">A better way to learn</p><h2>Give a little.<br /><em>Get a lot.</em></h2></div>
        <div className="steps">{highlights.map((item) => <article className="step" key={item.number}><span className="stepNumber">{item.number}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>
      <footer className="footer wrap"><Link className="brand" href="/">skill<span>barter</span></Link><p>Good things happen when skills are shared.</p><span>© {new Date().getFullYear()} SkillBarter</span></footer>
    </main>
  );
}
