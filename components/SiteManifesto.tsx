/**
 * Semi-hidden personal note — expandable at the bottom of every page.
 */
export function SiteManifesto() {
  return (
    <div className="site-manifesto-wrap">
      <details className="site-manifesto">
        <summary className="site-manifesto__summary">
          Why this exists — a note for mount farmers
        </summary>
        <div className="site-manifesto__body">
          <p>
            If you&apos;ve ever reset a raid for the 87th time and thought,
            &quot;yeah this is normal behavior,&quot; this is for you.
          </p>
          <p>
            There&apos;s a certain type of player in World of Warcraft who just
            gets it. You log in, not to push keys or chase parses, but to go
            back to the same boss you&apos;ve killed every week for the past
            year because <em>this might be the week</em>. It never is. Except
            when it is, and then suddenly it was all worth it.
          </p>
          <p>
            Mount farming is kind of absurd when you really think about it.
            You&apos;re voluntarily signing up for a long-term relationship with
            RNG. You know the drop rate is terrible. You know the lockout. You
            know the route. And yet every time that boss dies, there&apos;s still
            that tiny moment where your brain goes, &quot;okay but
            what if…&quot;
          </p>
          <p>That feeling is the whole reason this project exists.</p>
          <p>
            Not to take that away. Not to min-max the fun out of it. Just to
            make the rest of it a little less annoying.
          </p>
          <p>
            Because let&apos;s be honest, the actual farming is fine. The
            annoying part is everything around it. Trying to remember what you
            already ran this week. Figuring out what you&apos;re missing.
            Opening a dozen tabs to piece together drop rates, locations, weird
            requirements, and half-buried comments from 2014 that may or may not
            still be accurate.
          </p>
          <p>
            At some point I realized I was spending almost as much time{" "}
            <em>figuring out what to farm</em> as I was actually farming.
          </p>
          <p>That felt… dumb.</p>
          <p>
            So this tool basically started as a way to answer one simple
            question without all the friction: &quot;what should I go run right
            now?&quot;
          </p>
          <p>
            You paste your mount collection, and it gives you a list that
            actually makes sense. Not just everything you&apos;re missing, but
            things you could realistically go do. Stuff that fits into the time
            you have. Stuff that isn&apos;t secretly unobtainable anymore. Stuff
            that other players have already figured out is worth your time.
          </p>
          <p>It&apos;s not trying to be perfect. It&apos;s trying to be useful.</p>
          <p>
            A lot of the ideas came from the same place all mount farmers learn
            from anyway: other players. The comment sections, the random tips,
            the weird little optimizations people discover after doing something
            way too many times. That stuff is gold, it&apos;s just buried.
            Pulling that forward in a way that&apos;s easy to use felt like a
            no-brainer.
          </p>
          <p>
            Also, selfishly, I just wanted something that didn&apos;t make me
            feel like I needed a second monitor and a spreadsheet to play the
            game.
          </p>
          <p>
            If you&apos;re the kind of person who keeps going back for that 1%
            drop, you already know this isn&apos;t really about efficiency.
            It&apos;s about the routine. The chase. The tiny hit of excitement
            when the loot window pops up even though you know better by now.
          </p>
          <p>This just helps you get to that part faster.</p>
          <p>
            And if it saves you from one &quot;wait, did I already run
            this?&quot; moment, or helps you finally get something that&apos;s
            been dodging you forever, then yeah, it&apos;s doing its job.
          </p>
          <p>Anyway, good luck on your next run.</p>
          <p>It&apos;s probably not going to drop.</p>
          <p className="site-manifesto__closing">…but it might.</p>
        </div>
      </details>
    </div>
  );
}
