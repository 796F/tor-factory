# disclaimer - this library doesn't work.

first update your brew

`brew update && brew install tor`

then install dependencies

`npm i`

then try out the test

`nodeunit test_tor.js`

and it should give you an error.  don't worry this is normal.

Now just read through the code, and it kind of shows you how things work.

tldr
Tor is a standalone program, you can control it via signals that you send to it.
so this is basically a node wrapper around the interface that tor exposes.

the functions implemented there are confirmed to have worked last year when I used this library, but as you can see its spaghetti.

I would clean it up but no time now ...

so if you do decide to do something similar, one can only hope you open source it and contribute to the world.

ps. if things don't work as you expect, its probably because of your tor config located in `/usr/local/etc/tor`.
