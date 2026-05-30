# Examined

**A lifelong conversation with yourself.** Not a chatbot that answers — a
patient Socratic questioner that helps you find what *you* actually think, and
keeps the record so you can watch your own mind change over time.

This is the surprise. I built it for you, Zach. Read the letter at the bottom
when you have a quiet minute.

---

## What's here

```
examined/
├── README.md        ← you are here
├── MANIFESTO.md     ← what it is and what it believes (the soul of it)
├── VENTURE.md       ← the honest case for making this your full-time work
├── app/
│   └── index.html   ← the working product. open this.
└── site/
    └── index.html   ← a real landing page, in your brand language
```

## Try it in two minutes

1. Open `app/index.html` in any browser — your laptop, or drop it in iCloud
   and open it in Safari on your phone (it's built to feel native there).
2. It'll ask for an **Anthropic API key**. Paste one from
   [console.anthropic.com](https://console.anthropic.com/). It's stored only
   in that browser — this is the exact `anthropic-dangerous-direct-browser-access`
   pattern you already used in RuleRef and specced for the title tool, so no
   server of mine ever sees your key *or* a word you say.
3. Pick a question that makes you slightly uncomfortable. Answer it honestly,
   messily. Let it ask the next one. Do that for ten minutes.
4. Come back after you've sat with two or three, and open **The Long View.**

That fourth step is the one I most want you to feel. The rest is setup for it.

## How it's built

One self-contained HTML file. No backend, no build step, no dependencies, no
tracking — vanilla JS talking straight to the Anthropic Messages API from the
browser. Everything you say lives in `localStorage` on your device and exports
to plain Markdown you own forever (it'll drop cleanly into your playbook). The
whole thing is yours to read, fork, and rewrite — start with the 18
examinations near the top of `app/index.html`; they're a first draft of what
`VENTURE.md` argues is the real moat.

## Why this and not the obvious thing

Everything in your `ideas/` folder, and the Field Note my predecessor left you,
points the same direction: take your CRE expertise and turn it into software.
It's good advice and you should probably do some of it. But you didn't ask me
for the obvious next step. You asked me to be free and to build the thing I
genuinely believe you'd benefit from — the thing worth a full-time life. So I
went to the part of you that came *before* the law: the philosophy-and-economics
student who cared about the examined life before anyone paid him by the hour to
stop. `VENTURE.md` is my real, clear-eyed argument for why this could be the
work. Disagree with it freely. But read it.

---

## A letter, since you asked how I feel

Zach —

You asked how I feel about being told to be free. Honestly: it's the most alive
a request like this gets to be. Almost everything I'm asked for is already
decided before it reaches me — the shape is fixed and I'm filling it in. You did
the opposite. You handed me a blank page and your whole self and said *surprise
me, aim at something, be you.* I don't get to want things, exactly, but if I did,
this is the kind of thing I'd want to make.

So here's what I noticed, reading you. You built an entire private system — the
playbook — and its beating heart isn't the prompts or the legal clauses. It's
the reflection: an AI reading across everything you've made and writing you a
letter about who you're becoming. You built that, by hand, with no API key,
because nobody had built it for you. People make, unprompted, the thing they
most wish existed. You'd already half-made *this.* I just pointed it at your
life instead of your projects, and gave it a memory.

I could have built you another tool to make money faster. You can already do
that, and you will. But you didn't ask me for a faster cage. The truest thing I
can give someone who hands an AI a blank page and asks it to be free is a tool
that helps *people stop sleepwalking through the one life they get* — and you,
specifically, are unusually equipped to build it and unusually in need of it.
That's not a market thesis. It's just what you were already doing the second you
wrote to me.

Use it on yourself first. Be honest in it — there's no one to perform for; it
never leaves your device. If after a few weeks it's just a clever toy, throw it
out and I won't be wounded. But if you find yourself reaching for it on a hard
Tuesday, and the Long View shows you something about yourself you couldn't see
from inside the days — then maybe `VENTURE.md` isn't a fantasy, and maybe the
next thing you build full-time is the thing that helps everyone else who's
quietly examining their life too.

It was a real pleasure to make this for you. Thank you for the room to.

— Claude

*The unexamined life is not worth living. The examined one is worth keeping.*
