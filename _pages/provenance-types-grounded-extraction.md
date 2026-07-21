---
layout: post
title: "A refinement type for grounded LLM extraction"
date: 2026-07-21 00:01:00
description: A small prototype that makes an LLM show where each extracted value came from, so you can check a knowledge graph is grounded in the source before trusting it.
permalink: /blog/2026/provenance-types-grounded-extraction/
nav: false          # not in the navbar
sitemap: false      # not in sitemap.xml
related_posts: false
---

I have been playing with effect typing in [effectful](https://github.com/BasisResearch/effectful), and I wanted to try one small thing: when an LLM extracts a knowledge graph from a document, can it show where each value came from, so you can check the extraction is grounded before trusting it? This is an early prototype and it lives on a branch, but the basic version works. The runnable code is in [this notebook](https://github.com/datvo06/effectful/blob/effect-typing-full/docs/source/kg_extraction.ipynb).

## the setup

Give the model two operations. `find_span(document, query)` locates a piece of text and returns where it is; `make_triple(subject, relation, object)` builds an edge. A grounded extraction of "Marie Curie was born in Warsaw." looks like:

```python
make_triple(find_span(document, "Marie Curie"), "born_in", find_span(document, "Warsaw"))
```

Both endpoints are spans the model actually found. The failure I want to catch is this one:

```python
make_triple(find_span(document, "Marie Curie"), "citizen_of", Span("Poland"))
```

"Poland" is a real fact, and it is not in the document. The model built that span itself. For a knowledge graph you want to trust as evidence, that is the thing to rule out.

## a precondition on provenance

The idea is to make that a type. `Requires(find_span)` on an argument says: you may only pass me a span that `find_span` produced.

```python
def make_triple(
    subject: Annotated[Span, Requires(find_span)],
    relation: str,
    object:  Annotated[Span, Requires(find_span)],
) -> Triple: ...
```

It is the precondition companion to `Uses` ([#664](https://github.com/BasisResearch/effectful/issues/664)), which is a postcondition on what an operation does. And it is not extra bookkeeping: the provenance is already in the value, as long as you keep the value symbolic.

## checking it

In effectful a program is a term before it is a value. Every operation call goes through one `apply` operation, so you can interpret `apply` to build a tree instead of computing. `check_requires` then walks that tree and, at each `make_triple`, asks whether the subject and object subterms mention `find_span`. The `Span("Poland")` one does not, so it is flagged.

```python
check_requires(grounded)      # {}
check_requires(hallucinated)  # the object of make_triple is not from find_span
```

No labels, no second model, no calls to verify. It is the same fold that computes `typeof`, with the accumulator swapped to "where did this come from."

I want to be precise about one thing, because I got it wrong at first and a careful reader would ask. An early version ran the term through the evaluator, which executed any operation that had a real implementation and collapsed `find_span(...)` back into a concrete span, losing the provenance. A check must not run the effects it is guarding. The current version does not: `check_requires` is a pure walk, and building the tree replaces `apply`, so no operation's real implementation runs, which I check directly by asserting a side-effecting operation is never called during a check. What it does still do is run the synthesized *program* to build the tree in the first place. That is fine for a straight-line extraction, but I would not call it fully static yet. The clean version reads the provenance off the model's syntax directly, since the synthesis path already parses the function, and never runs the model's code at all. That is the next thing to fix.

## making the LLM do it

The model does not call tools one at a time here. It writes the extraction as a function and submits that, the code-synthesis path. So the check goes right there: take the function it wrote, check it, and if a triple uses an invented span, reject the answer and feed the reason back so it revises. That is a small handler on top of the existing retry loop.

A real gpt-4o run: given "Marie Curie was born in Warsaw. Paris is the capital of France.", the model writes a function that calls `find_span` for every span, so the check accepts it and returns two grounded triples. When I loosened the prompt to invite outside knowledge, it built `Span("Poland")`, and the check answered with the message the model then sees:

```
argument 'object' of make_triple() must be a value produced by find_span(),
not one constructed directly.
```

So the model cannot quietly pass off an ungrounded triple: an unfound span is not a value `make_triple` accepts, and the harness will not run the answer until it is.

## caveats

A few, and they matter. As above, the check still runs the synthesized program to build the tree; making it fully static is on the list. It reads a synthesized program, where provenance is structural, so it does not help with values a model returns through ordinary JSON tool calls, which arrive with no history. And it over-approximates, so it wants the synthesized function to be roughly straight-line over its operations. `find_span` and `make_triple` are also just stand-ins: the same `Requires` would express a taint check or a capability, the knowledge-graph case is only the one where "the model made that up" has an obvious cost.

It is small and early, built on the effectful LLM handlers. The check on its own and the LLM loop are in the [notebook](https://github.com/datvo06/effectful/blob/effect-typing-full/docs/source/kg_extraction.ipynb) and the [end-to-end example](https://github.com/datvo06/effectful/blob/effect-typing-full/docs/source/kg_extraction_llm.py) on the branch.
