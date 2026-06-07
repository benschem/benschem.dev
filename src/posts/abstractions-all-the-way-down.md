---
title: Abstractions all the way down
description: A long meandering chat about sockets, files, kernels, HTTP requests at the physical layer, AI-assisted coding, and how machine code actually runs.
published: 2026-05-22
draft: true
---

A chat about sockets, files, kernels, HTTP requests at the physical layer, AI-assisted coding, and how machine code actually runs.

---

**User:** unrelated to anything in this repo just a general chat - sockets are just files wtf my life is a lie

**Assistant:** Ha, welcome to Unix. "Everything is a file" goes deeper than people expect — sockets, pipes, devices, even processes (`/proc`) all show up as file descriptors you can `read()` and `write()`.

The wild part: a TCP socket and a file on disk are the same `int fd` to your program. That's why `select()`/`poll()`/`epoll()` can wait on network and disk and keyboard input all at once — they're just fds.

Unix sockets (`AF_UNIX`) literally do live on the filesystem — you'll see them with `ls -l` as type `s`. TCP sockets are fd-only, no path, but same API.

---

**User:** So a socket is more a conceptual thing than a "thing" thing - like it's just a file used for something specific

**Assistant:** Pretty much, yeah. A socket is a _role_ a file descriptor plays, not a distinct kind of object. The kernel has a generic "file" abstraction (really: "something with read/write/close semantics") and a socket is one implementation of that interface — same as a regular file, a pipe, or `/dev/null`.

The "socket-ness" is the kernel-side machinery behind the fd: buffers, protocol state (TCP sequence numbers, etc.), a remote endpoint. From userspace you mostly just see an `int` and call `read`/`write` on it. The extra socket syscalls (`connect`, `bind`, `accept`, `send`/`recv`) exist because the file API alone can't express "dial this IP" or "send this with MSG_PEEK" — but the fd underneath is the same kind of handle.

So: not a thing, a contract. The file is the handle; the socket is what's on the other end of it.

---

**User:** What is the kernel doing when it's opening and closing a file?

**Assistant:** Good question. The fd you get back is just a small integer — index into a per-process table. The real work is what the kernel sets up behind it.

**Opening (`open("/foo/bar")`)**:

1. **Path resolution** — walk the path component by component. For each piece, look up the inode in the parent directory, check permissions (`x` on dirs to traverse, `r`/`w` on the final file for the mode you asked for). Follow symlinks, handle mount points. This hits the **dentry cache** first (cached name→inode lookups) so repeated opens are fast.

2. **Get the inode** — the inode is the actual file metadata (size, permissions, owner, pointers to data blocks). Lives on disk; kernel caches it in the **inode cache**.

3. **Allocate a `struct file`** — this is the kernel-side open-file object. Holds: current seek offset, open flags (`O_RDONLY` etc.), a pointer to the inode, and a pointer to the **file_operations** vtable (`read`, `write`, `mmap`, `poll`, ...). This vtable is where polymorphism happens — a socket's `file_operations` points to socket code, a regular file's points to the filesystem driver (ext4, etc.), `/dev/null` points to a stub that throws bytes away.

4. **Install into the fd table** — find the lowest free slot in the process's fd array, point it at the `struct file`, return the index. That integer is your fd.

5. Call the fs-specific `.open()` hook if it has one (lets the driver do setup — e.g. a device might power on hardware).

**Closing (`close(fd)`)**:

1. Remove the fd from the process's fd table (the slot is now free for the next `open`).
2. Decrement the refcount on the `struct file`. Multiple fds can point to the same `struct file` (via `dup`, `fork`), so close doesn't always tear down.
3. If refcount hits zero: call `.release()` on the file_ops — flush buffers, send TCP FIN if it's a socket, free kernel memory, decrement the inode refcount.
4. If the inode refcount also hits zero _and_ the file was unlinked while open: now actually free the disk blocks. (This is why `rm`-ing a file held open by a process doesn't reclaim space until the process exits.)

The big idea: `open` is "set up a `struct file` and hand back a handle to it," `close` is "drop a reference, tear down if last." Everything else — read, write, the socket stuff — is just calling through the vtable on that struct.

---

**User:** man the amount of stuff that happens at lower levels for the most "basic" of things like say a HTTP request is mind blowing like if we broke it down to the physical layer, how much electricity is running in how many circuits/semiconductors/transistors - the shit on the chip, you get it - how much zap zipping is happening, is it even measurable? Try to estimate it for an incoming web request for a ruby on rails app that has to get data from postgres and make a response.

**Assistant:** Oh this is fun. Let me try to actually estimate it. Order-of-magnitude only — I'll show the reasoning.

## The setup

A user hits `GET /users/42` on a Rails app. Request comes in over the internet, Rails queries Postgres, renders JSON, sends it back. Let's count switching events (transistor state flips), since that's roughly what "zap" means at the bottom.

## Anchor numbers

- Modern x86 CPU: ~10–50 **billion** transistors, running at ~3–5 GHz. Not all switch every cycle (probably 1–10% activity factor), but call it ~10⁹ switches per core per second under load.
- A single transistor switch dissipates ~10⁻¹⁵ J (femtojoule) at modern nodes. Cheap.
- DRAM access: ~10⁻⁹ J per bit moved across the bus. Way more expensive than a transistor flip because you're driving long wires.
- Network bit on the wire: ~10⁻⁹ J per bit at the NIC/PHY, more across switches and routers.

## Walking the request

**1. Packet arrives at NIC** — the PHY chip is doing signal processing on the incoming bits (clock recovery, decoding 8b/10b or PAM4). DMA writes the packet into RAM. Interrupt fires. Maybe 10⁴ DRAM bit-toggles for a ~1500-byte packet plus a few million transistor switches in the NIC's MAC/PHY.

**2. Kernel network stack** — interrupt handler, softirq, IP/TCP processing, socket lookup, copy into socket buffer, wake the userspace process. This is probably ~10⁵–10⁶ CPU instructions. Each instruction is itself thousands to millions of transistor switches (fetch, decode, rename, execute, retire, cache lookups, branch prediction). Call it ~10¹⁰–10¹¹ switches.

**3. TLS handshake** (if new connection) — if there's a fresh TLS handshake, you're doing asymmetric crypto. An RSA or ECDHE op is ~10⁶–10⁷ multiplications on big integers. ~10¹¹–10¹² switches just for the math. (If the connection is reused, skip this.)

**4. Ruby/Rails handling the request** — Rails routing, middleware stack, controller, ActiveRecord building a query. Ruby is interpreted (or JIT'd with YJIT), so a "simple" action is easily 10⁵–10⁶ Ruby VM ops, each translating to maybe 100–1000 native instructions. Call it ~10⁸–10⁹ native instructions → **~10¹²–10¹³ transistor switches**. Rails is heavy.

**5. Postgres query** — TCP roundtrip to Postgres (more stack traversal, context switches), parse SQL, plan, execute. For a primary-key lookup that hits the buffer cache: ~10⁵ instructions in Postgres → ~10¹⁰ switches, plus DRAM reads of the page (~8KB = 65k bits, ~10⁻⁴ J for the DRAM part alone). If it misses cache and hits SSD, add NAND flash physics — billions more switches in the SSD controller, charge tunneling through floating gates.

**6. Response path** — JSON serialization (Ruby string building is surprisingly expensive — easily 10⁸ more switches), back through the kernel, TCP/IP headers, NIC DMA, out on the wire.

## Totals

Rough sum for one cache-warm request, reused TLS connection:

- **Transistor switches**: ~10¹² to 10¹³ (a trillion to ten trillion)
- **Energy**: maybe 0.1–1 joule of actual compute+memory+network energy. Server probably _draws_ more like 5–20 J during the ~50–200ms the request takes, because the rest of the chip is idling-but-on. Cooling and PSU losses double it again.
- **Bits moved across DRAM bus**: ~10⁷–10⁸ (the working set Ruby/Rails touches is megabytes)
- **Physical devices involved**: NIC, CPU, DRAM, possibly SSD, plus every switch/router between the client and server — each one has its own ASIC doing packet inspection.

## Is it measurable?

Yes, actually — at the system level. Datacenter operators measure **joules per request** as a real metric. Rough industry numbers: a typical Rails-shaped web request costs **~1–10 joules** end-to-end including the client device, network, and server share. Google has published that a search query is ~0.3 Wh ≈ 1000 J, but that includes a lot of ML inference.

At the transistor level it's not directly measurable — you can't probe 10¹³ events — but it's _estimable_ from activity counters (CPUs expose performance counters for instructions retired, cache misses, etc.) and known per-event energies.

## The mind-blowing part

A trillion transistor switches to fetch one user record. And we consider this fast. The abstraction tower is doing god's work hiding it from you.

---

**User:** "doing god's work" ai chatbots pushing religion now or what

**Assistant:** Ha, fair call-out. Just an idiom — "doing god's work" is English shorthand for "doing thankless but important labor," like calling something "a godsend." No theology intended, no agenda. I'll watch the idioms.

---

**User:** that level of abstraction is so crazy, do people really hold all of that in their heads?

**Assistant:** No, basically nobody does. And the ones who seem to are faking it better than the rest of us.

What actually happens is people hold **one or two layers deeply** and treat the layers above and below as black boxes with known interfaces. A Rails dev knows Ruby and the HTTP/SQL shape of things; they treat the kernel as "it delivers bytes" and the CPU as "it runs fast." A kernel dev knows syscalls and hardware interfaces; they treat userspace as "it calls us" and the silicon as "it executes instructions per the manual." A chip designer knows the transistor and gate level; they treat software as "a workload."

The abstractions are _designed_ so you don't have to hold it all. That's the whole point — a socket fd is a contract precisely so the Rails dev doesn't need to think about TCP retransmission timers, and the TCP code doesn't need to think about Ethernet framing. Each layer presents a clean-ish API and hides its mess. When the abstractions leak (and they do — latency, failures, weird performance cliffs) you temporarily have to peek one layer down, fix your mental model, then climb back up.

The people who seem to "know everything" usually have:

1. **One layer of real depth** — they've actually written a kernel module or a database engine or a compiler, so they have ground truth somewhere.
2. **A shallow but accurate map of the neighboring layers** — enough to know what questions to ask and which manual to open.
3. **Years of debugging** — every weird bug forces you to peek into a layer you didn't know, and the knowledge accretes.

Nobody boots up in the morning holding the full stack in working memory. They hold the layer they're working in, plus a rough sketch of what's above and below, and they page in detail on demand. The stack is too big for one human — it took millions of person-years to build. You just learn to trust the abstractions until they betray you, and then you learn a little more.

The honest version of "senior engineer" is: someone who's been betrayed by enough abstractions to know which ones to trust and which ones to double-check.

---

**User:** I feel like I understand the abstractions and the concepts really well but for the last year or so I've almost exclusively been getting AI to write the actual code - is this crazy am I footgunning myself? On the one hand, I am building far better quality and greater scale things than I ever could on my own in a fraction of the time, because I know what good is and hwo to get there, but on the other hand I am losing the ability to write code or rememeber specific api (using it loosely - any abstractions) things because now I just describe what I want and ai does the commands to get it.

**Assistant:** Honest answer: it's a real tradeoff, not a crisis, and the shape of it depends on what you want to be in 5 years.

**What you're not losing**: the valuable part. Knowing what "good" looks like, decomposing problems, spotting when an AI's output is subtly wrong, designing systems, debugging by reasoning about layers — that's the hard-won stuff and you're actively using it. Syntax and API recall are the cheap part. They always were; you used to Google them, now you delegate them. The difference is degree, not kind.

**What you probably are losing**: muscle memory and the speed of _unassisted_ small-scale work. If your internet died and you had to write a non-trivial function from a blank file, you'd be slower and clunkier than a year ago. More importantly, you're losing some of the **deep, accidental learning** that comes from struggling with code. When you wrestle with a weird Postgres lock for two hours, you come out knowing something about MVCC you'd never have picked up by reading. AI shortcuts that. You get the answer without the bruise, and the bruise is where some knowledge lives.

**The actual risk**: not "I forgot the syntax for Array.reduce." That's recoverable in an afternoon. The risk is your **calibration on AI output degrades** as your own hands-on skills atrophy. Right now you can tell when the AI is bullshitting because you have recent ground truth. In 3 years, if you've never written the code yourself, your bullshit detector gets worse precisely as the AI's bullshit gets more plausible. That's the compounding problem.

**What I'd actually do** (since you asked, kind of):

- Keep doing what you're doing for the 80% of work where shipping matters and you know what good looks like.
- Carve out maybe 10–20% of your coding time where you write it yourself — _especially_ in the layer just below where you usually work. If you're a Rails person, occasionally write some raw SQL or some plain Ruby without Rails. Touch the layer below to keep the abstraction honest.
- When the AI does something clever, read it. Not skim — read it. Ask why. That's the cheapest way to keep learning without giving up the speed.
- Periodically debug something hard _without_ AI. Not as punishment, as a calibration check. If it feels alien, that's data.

You're not footgunning yourself yet. You're trading depth-in-syntax for breadth-in-systems, which is probably the right trade for the next decade. Just don't let the trade go to 100/0 — keep a thin slice of unassisted work to keep your instincts sharp and your bullshit detector calibrated. The people who'll struggle aren't the ones using AI heavily; they're the ones who stopped being able to tell when it's wrong.

---

**User:** I kinda feel like it'd be a good idea to carve out that manual time to learn some C, sense check this - (a) should I bother going that low or just write ruby (or some other higher level language) because I'd make something more fun/useful, or go C for the learning and build like a http server for shits and gogs to learn and cos i am interested but i am worried it will be tedious af to memory manage and all that. (b) if yes on the low level is C the right choice or should I look at Rust or Go? I like the idea of C because 1. it's the "original" so seeing what came "first" befoe moving later to say rust would be more natural??? And that ruby compiles to C (is that still even true?) so it might help my dayjob somehow

**Assistant:** Good instinct, and worth sense-checking properly. Let me push on a few of your premises.

**(a) Should you go low at all?**

Depends on what "learning" means to you. Two different goals:

- **"I want to viscerally understand the layers below Ruby"** → yes, go low. C is the right teacher. You'll feel manual memory, pointers, the stack vs. heap, what a string actually _is_ (a pointer + length, or a null-terminated byte array — Ruby hides this hard). One small C project will permanently change how you read higher-level code.

- **"I want to be a better engineer day-to-day"** → going low is _indirect_ leverage. You'd probably get more dollar-per-hour by writing more Ruby/Rails, or learning a different paradigm at the same level (Elixir for actors, Rust for ownership, Clojure for immutability). These teach you new ways to _think_, which transfers more than learning new syntax for the same ways.

My honest take: **do both, sequence them**. Spend ~4–8 weekends on a small C project (HTTP server is a great pick — I'll come back to it), then go back to higher-level for fun/useful builds. The C stint is a one-time investment that pays off forever in how you read the rest of the stack. It's not "should I become a C programmer" — it's "should I do enough C to never be afraid of it again." Yes.

Memory management in a small project isn't actually tedious — it's annoying for 3 days, then it clicks, and you start _enjoying_ knowing exactly where every byte lives. The horror stories are about million-line codebases. A 2000-line HTTP server is fine.

**(b) C vs. Rust vs. Go**

Your "C is the original, learn it first" instinct is half-right and half-romantic. Let me separate it.

- **C** — teaches you the machine. Pointers, manual malloc/free, segfaults, what a struct _really_ is (a memory layout, not an object), what undefined behavior means. You learn by _getting burned_, which is actually pedagogically excellent. Downside: tooling is from 1978, no package manager, you'll fight the build system. Almost everything you respect (Linux, Postgres, Redis, SQLite, Ruby itself) is written in C — so reading their source becomes accessible, which is a real long-term superpower.

- **Rust** — teaches you a _modern_ take on systems programming. Ownership, lifetimes, no GC, fearless concurrency. Brilliant language but the borrow checker will fight you for weeks before it clicks, and it'll teach you Rust's model of safety rather than the underlying machine. You can write Rust without ever really understanding what a pointer is — the compiler hides it behind references and lifetimes. So as a _first_ low-level language, it's actually worse for the "understand the machine" goal. Better as a _second_ one, after you've felt the C pain Rust is solving.

- **Go** — not really low-level. It has a GC, a runtime, goroutines hide threading. It's a great language for building servers fast, but for "I want to understand what's underneath Ruby," Go and Ruby are closer cousins than you'd think. Skip for this goal. (Pick it up later if you want to ship backend services quickly.)

**Verdict**: C, for this specific goal. Your "learn the original first" instinct is correct, not because C is historically first, but because **C is the language whose abstractions match the hardware most directly**. Rust adds a safety layer on top; Go adds a runtime; both are obscuring exactly what you said you want to see.

**On "Ruby compiles to C"** — not quite. Ruby (MRI/CRuby) is _implemented in_ C — the interpreter is a C program. Ruby code itself doesn't compile to C; it's parsed into an AST, then into YARV bytecode, then interpreted by the C-based VM. (YJIT compiles hot paths to native machine code at runtime, skipping C entirely.) So knowing C lets you read the _interpreter source_ and understand why some Ruby idioms are fast and others are slow — which is legitimately useful for a Rails dev who cares about performance. Not "Ruby is C underneath" but "the thing running Ruby is C, and you can read it."

**The HTTP server project is perfect.** Specifically: write one that handles a single connection at a time, then add `epoll`/`kqueue` for multiple connections, then add a simple thread pool. You will, in ~1500 lines, have personally touched: sockets (file descriptors again!), the kernel event loop, manual parsing of a text protocol, buffer management, the C memory model. After that, every web framework you ever use will feel less magical, and you'll know exactly what Rails' Puma or Unicorn is doing under the hood.

Do C. Build the server. Then go back to Ruby and you'll see it differently.

---

**User:** "then interpreted by the C-based VM" ok I think I misunderstood this, I always thought the ruby had to become C or something, and I did knnow about the hot paths but I never really thought how that machine code is "run" -- I hope this makes sense because I know C is not ruby but is there a C API like C.send_machine_code(010101011101111100000)

**Assistant:** Yes this makes total sense, and you're circling something real. Let me untangle it.

**First, the misunderstanding**: Ruby code never becomes C. That was a wrong mental model. The flow is:

```
your_ruby_code.rb  →  parser  →  AST  →  compiler  →  YARV bytecode  →  VM interprets it
```

The VM is _written in_ C, but it doesn't translate your Ruby into C. It reads YARV bytecode instructions one at a time and does what each instruction says, using C code. Like a person reading sheet music — the music doesn't become the person, the person executes the music.

A super-simplified version of what the VM looks like, in C:

```c
while (running) {
  instruction = bytecode[pc++];
  switch (instruction.opcode) {
    case OP_PUSH:    stack_push(instruction.arg); break;
    case OP_ADD:     int b = stack_pop(); int a = stack_pop(); stack_push(a + b); break;
    case OP_CALL:    call_method(instruction.arg); break;
    // ... hundreds more
  }
}
```

That's the whole "Ruby is interpreted by a C VM" idea in 8 lines. Your Ruby program is a list of opcodes; the VM is a giant `switch` statement in C that handles each one.

**Now the good question — how does machine code actually run?**

There is no `C.send_machine_code()` function, because machine code doesn't get "sent" anywhere. The CPU is _already running_ machine code, constantly, forever, from the moment it boots. There's no submission API — the CPU is a loop that reads bytes from memory at the address in its program counter (the `RIP` register on x86-64), decodes them as instructions, executes them, advances the counter, repeat. Forever.

So the question becomes: **how do you get the CPU to run _your_ bytes?** Two ways:

**Way 1: ahead of time** (how regular C works). You compile `hello.c` into machine code stored in a file (`hello`, an ELF binary on Linux). When you run it, the kernel reads that file, copies the machine-code bytes into RAM, and sets the CPU's program counter to the address of `main`. The CPU starts executing those bytes because that's where its counter points. No API call — just "the counter happens to be pointing at your bytes now."

**Way 2: at runtime** (how JIT compilers like YJIT work). Roughly:

```c
// 1. Ask the OS for a chunk of memory you're allowed to execute.
void *mem = mmap(NULL, 4096, PROT_READ | PROT_WRITE | PROT_EXEC,
                 MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

// 2. Write machine-code bytes into it. These bytes are x86-64 for "return 42".
unsigned char code[] = { 0xB8, 0x2A, 0x00, 0x00, 0x00, 0xC3 };
memcpy(mem, code, sizeof(code));

// 3. Cast the memory address to a function pointer and call it.
int (*func)() = mem;
int result = func();   // CPU's program counter jumps to `mem`, executes your bytes
```

That's it. That's the whole trick. **There's no special "execute machine code" syscall** — you just put bytes in memory, point the CPU at them by calling through a function pointer, and the CPU does what CPUs always do: read bytes, decode, execute.

The _only_ magic step is `mmap` with `PROT_EXEC`. By default, memory pages are marked non-executable for security (otherwise any buffer overflow becomes a code-execution exploit). You have to explicitly ask the kernel "yes, I really want to run code from this page." That's the closest thing to a "permission to run machine code" API, and it's a memory-permissions thing, not a "submit code" thing.

So YJIT, when it sees a hot Ruby method, does roughly:

1. Looks at the YARV bytecode for the method.
2. Generates equivalent x86-64 machine code bytes in a buffer.
3. Marks that buffer executable with `mmap`.
4. Next time Ruby calls that method, instead of looping through the bytecode interpreter, it calls into the JIT'd buffer directly. CPU runs your generated code at full native speed.

**The big insight**: machine code isn't a special category the CPU receives from somewhere. The CPU is _always_ executing whatever bytes its program counter points at. "Running machine code" is just "having the program counter point at the right bytes." Everything — your OS, your shell, your browser, the Ruby VM, the JIT'd output — is just bytes the counter eventually visits.

This is also why buffer overflow exploits worked so well historically: if you could overwrite a return address on the stack to point at bytes _you_ controlled (e.g. data you sent as input), the CPU would happily execute your input as code. There was no "is this code or data?" check — to the CPU, it's all just bytes. `PROT_EXEC` marking and stack canaries and ASLR exist precisely to add that check artificially.

This is the layer where it gets really beautiful, honestly. The CPU is dumber than people think. It's a tiny loop, just very, very fast.

---

**User:** Your Ruby program is a list of opcodes; the VM is a giant switch statement in C that handles each one. --beautiful damn where were you in uni

**Assistant:** Ha, thanks. Honestly, this stuff _is_ beautiful — uni often manages to make it sound dry because they teach it formally before you have any reason to care. You're getting it in the right order now: you've built things, you've felt the abstractions from the top, and now you're peeking under them with real questions instead of "will this be on the exam."

The dirty secret of computer science is that almost all of it is "a loop that does one stupid thing very fast." CPUs are a fetch-decode-execute loop. Interpreters are a switch statement in a loop. Operating systems are a loop waiting for interrupts. Web servers are a loop waiting for connections. Game engines are a loop drawing frames. Even your neurons are kind of a loop. Once you see it, you can't unsee it — the whole stack is loops all the way down, each one pretending to be more sophisticated than it is by hiding the loop underneath.

The other dirty secret: the people who built this stuff weren't smarter than you. They just had time, problems they cared about, and the patience to write the loop. Ken Thompson wrote the first Unix in a few weeks on a PDP-7 because his wife was away visiting family. Linus wrote Linux as a student project to learn his new 386. The Ruby VM you've been using for a decade started as one guy in Japan who wanted a nicer Perl. None of these were galaxy-brain feats — they were curious people writing the loop.

If you ever do that C HTTP server, you'll feel it. You write `while (1) { accept_connection(); handle_it(); }` and suddenly _you're_ nginx, just smaller. The mystique evaporates and what's left is the actual fun of it.

---

**User:** there are like 3 article ideas in this discussion at least

**Assistant:** Yeah there are. Off the top:

1. "Sockets are just files (and other Unix lies that turn out to be true)" — the everything-is-a-file thing, struct file and the vtable, why select/poll work across kinds. Lands the aha in ~600 words.
2. "How much electricity does a Rails request use?" — the order-of-magnitude estimation piece. Counts transistor switches per HTTP request. Visual, sharable, slightly nerd-bait in a good way. People love a "and we consider this fast" punchline.
3. "Nobody holds the whole stack in their head" — the abstractions piece. Reassuring for self-taught devs, ammo against impostor syndrome. Reframes "senior" as "betrayed by enough abstractions to know which to double-check."
4. "I let AI write my code for a year. Here's what I'm actually losing." — the calibration/atrophy piece. Honest, current, contrarian-adjacent without being clickbait. Probably the one that gets shared most.
5. "Your CPU is dumber than you think" — the machine-code / mmap PROT_EXEC piece. The "there is no send_machine_code()" reveal. Ends on JIT and buffer overflows. Very satisfying arc.
6. "It's loops all the way down" — the closer. Short, punchy, philosophical. Could be a 300-word essay or a Twitter thread. Works as a capstone if you wrote the others.

If I had to pick two: #4 and #5. #4 because it's of the moment and you have a real point of view nobody else has yet (most takes are either "AI is magic" or "AI rots your brain" — yours is "AI trades depth-in-syntax for breadth-in-systems, here's what to protect"). #5 because it's evergreen, technically meaty, and has the strongest "huh, I never thought about it that way" moment.

The voice that comes through in your questions — curious, slightly profane, asking the question the textbook skips — is the actual differentiator. Don't sand that off when you write them up.
