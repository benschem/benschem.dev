---
title: Serverless, explained for the 2008 mental model
description: V8 Isolates, AWS Lambda, and Netlify Functions — what's actually running your code, for the developer who learned web back when you rented a VPS and installed your own OS.
published: 2026-02-27
draft: true
---

> can you explain more about v8 isolate and aws lambda? What exactly are these running on? Imagine I completed a computer science degree in 2008 but then never worked as a dev until recently. I know Javascript and understand v8 but I dont understand how these things can run without a VPS?

They absolutely run on servers — you just don't manage them. Here's what's actually happening:

## The 2008 mental model

Back then, to run server code you'd rent a VPS (or rack a physical box), install your OS, your runtime, your app, and keep it running 24/7. Your process sat there in memory waiting for requests. You paid whether traffic was zero or a million.

## AWS Lambda (what Netlify Functions use)

Amazon has warehouses full of servers running a modified Linux. When a request hits your Netlify function:

1. Amazon picks a server that has spare capacity
2. Spins up a lightweight container (like a stripped-down Docker container) with Node.js installed
3. Loads your function code into it
4. Runs your function, returns the response
5. Keeps the container warm for a few minutes in case another request comes
6. If no more requests, kills it — you stop paying

The key insight: Amazon is running thousands of these containers across a huge fleet. Your function doesn't have a "home server." It runs wherever there's capacity at that moment. Amazon handles all the bin-packing — fitting thousands of customers' functions onto shared hardware.

It's still a Linux process running on a real x86 CPU. The "serverless" part just means you never SSH into anything, never patch anything, never think about capacity. Amazon's orchestrator handles placement.

Cold start is the downside — if your container was killed and a new request arrives, there's a ~200-500ms delay to spin up a fresh one. That's why SSR pages sometimes feel slow on the first hit.

## V8 isolates (what Cloudflare Workers use)

Lambda's approach has overhead — each function gets its own container with its own Node.js process, its own memory space. Cloudflare took a different approach.

Remember how V8 has isolates — independent instances of the V8 engine that share the same process but have completely separate heaps? Chrome uses this for tabs. Each tab gets its own isolate so one tab can't read another tab's memory.

Cloudflare runs a single process on each edge server with many V8 isolates inside it. When your request arrives:

1. Cloudflare picks an edge server near the user (they have ~300 locations worldwide)
2. That server already has a V8 process running
3. It creates a new isolate (or reuses a warm one) for your function
4. Your JavaScript runs inside that isolate, isolated from every other customer's code
5. Returns the response

The difference from Lambda:

|                       | Lambda                     | V8 Isolate                         |
| --------------------- | -------------------------- | ---------------------------------- |
| Isolation boundary    | Container (OS-level)       | V8 isolate (process-level)         |
| Startup time          | ~200-500ms cold start      | ~5ms (just creating an isolate)    |
| Runtime               | Full Node.js, any language | JavaScript/WASM only, no Node APIs |
| Overhead per function | ~128MB minimum             | ~1-2MB                             |
| Location              | A few AWS regions          | 300+ edge locations                |

V8 isolates are faster and cheaper because they skip the whole OS-level container. The tradeoff is you're limited to what V8 provides — no filesystem access, no native modules, no spawning processes. It's a browser-like sandbox on the server.

## So who owns the servers?

Amazon, Cloudflare, and Google own massive data centres. They buy the hardware, run the hypervisors, handle the networking. You're essentially timesharing on their machines, but at a much finer granularity than a VPS. Instead of renting a whole virtual machine by the month, you're renting a few milliseconds of CPU time per request.

It's the same progression as the rest of computing — mainframe timesharing in the 60s, shared hosting in the 2000s, VPS in the 2010s, and now function-level timesharing. The servers never went away, the abstraction layer just moved up.

---

> so what hardware and software are these things? x86 running nginx and linux??? I assume they aren't using apache haah

## Lambda (AWS)

**Hardware:** Custom x86 servers designed by Amazon (they call them Nitro). In recent years they also built their own ARM chips called Graviton — Lambda functions can run on either. It's not off-the-shelf Dell/HP stuff, it's Amazon-designed motherboards optimised for density and virtualisation.

**Virtualisation:** This is the interesting part. They don't use Docker for Lambda. They built a custom microVM called Firecracker — open source, written in Rust. It boots a minimal Linux kernel in ~125ms. It's much lighter than a full VM (like what a VPS uses) but gives stronger isolation than a container. Each Lambda function gets its own Firecracker microVM.

**OS:** A stripped-down Amazon Linux inside the microVM. Just enough to run your runtime (Node.js, Python, whatever).

**Web server:** No nginx, no Apache. There's no traditional web server in the picture at all. Amazon has their own proprietary API Gateway / Application Load Balancer that receives HTTP requests and invokes Lambda functions directly via internal APIs. It's not "receive HTTP request → proxy to a running process." It's "receive HTTP request → call the Lambda service API → Lambda orchestrator finds/starts a microVM → passes the request in as a function argument → gets the response back."

The request routing is completely custom infrastructure — not anything you could install on a Linux box.

## Cloudflare Workers

**Hardware:** Standard x86 servers in ~300 locations, mostly in existing internet exchange points and ISP facilities worldwide. Cloudflare leases rack space in these facilities. Less custom than Amazon — more commodity hardware.

**Software:** Each edge server runs Linux with a custom Cloudflare stack on top. The Workers runtime is essentially a modified build of V8 (not Node.js — raw V8 with their own APIs bolted on). One long-running process handles thousands of isolates.

**Web server:** Cloudflare's entire edge is built on a custom Rust + C proxy stack. They used to use nginx heavily but have been replacing it with their own thing called Pingora (open-sourced in 2024, written in Rust). It handles TLS termination, DDoS protection, caching, and routing requests to the Workers runtime — all in the same process pipeline.

## The key shift from 2008

Back then the stack was: hardware → Linux → nginx/Apache → your app process

Now it's more like:

```
Lambda:      hardware → Nitro hypervisor → Firecracker microVM → minimal Linux → your function
Workers:     hardware → Linux → Pingora → V8 process → your isolate
```

Apache and nginx were designed for "one server, many requests." The new infrastructure is designed for "many servers, your code appears wherever it's needed." Totally different architecture, so the old tools don't fit.
