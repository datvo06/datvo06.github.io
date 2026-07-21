---
layout: post
title: "You can only use a span you found: provenance types for LLM extraction"
date: 2026-07-21 00:01:00
description: A refinement type that makes an LLM prove where each value came from, so a knowledge graph is grounded in the source by construction, checked before you trust it.
permalink: /blog/2026/provenance-types-grounded-extraction/
nav: false          # not in the navbar
sitemap: false      # not in sitemap.xml
related_posts: false
---

Recently I have been working on effect typing in [effectful](https://github.com/BasisResearch/effectful), and one question kept nagging me: when an LLM reads a document and extracts a knowledge graph, how do you know it did not just make a fact up?

Turns out you can catch it before you ever trust the output, with no gold labels and no second model grading the first. The trick is to make the LLM's own program prove where each value came from. Turns out it works.

## the problem, concretely

Say the document is "Marie Curie was born in Warsaw." and you want triples like `(Marie Curie, born_in, Warsaw)`. You give the model two operations: `find_span(document, query)` that locates a piece of text and returns where it is, and `make_triple(subject, relation, object)` that builds an edge. A good extraction looks like this:

```python
subject = find_span(document, "Marie Curie")
object  = find_span(document, "Warsaw")
make_triple(subject, "born_in", object)
```

Both endpoints are spans the model actually located in the text. Fine. But nothing stops the model from writing this instead:

```python
make_triple(find_span(document, "Marie Curie"), "citizen_of", Span("Poland"))
```

"Poland" is a real fact, and it is nowhere in the document. The model reached into its own head and built a span for it. If you are extracting a knowledge graph you want to trust as evidence, that is exactly the thing you cannot allow: an entity that reads like it came from the text but did not.

How do people usually catch this? A few ways: 1. hand-label a gold set and score against it, 2. ask a second model whether the extraction is faithful, 3. post-hoc string-match every span back into the document. The first needs labels, the second trusts one model to grade another, the third is a brittle patch bolted on after the fact.

## requires: a precondition on where a value came from

The cleaner move is to make it a *type*. In effect typing terms, this is a refinement type ([#664](https://github.com/BasisResearch/effectful/issues/664)): a value is acceptable only if its dataflow provenance contains a given operation. You write it on the argument:

```python
@defop
def make_triple(
    subject: Annotated[Span, Requires(find_span)],
    relation: str,
    object:  Annotated[Span, Requires(find_span)],
) -> Triple: ...
```

`Requires(find_span)` reads: "you may only pass me a span that `find_span` produced." It is the precondition companion to `Uses`. Where `Uses[op]` on a return type is a postcondition (the effects an operation performs), `Requires(op)` on an argument is a precondition on the value handed in. Postcondition, precondition: the two directions of the same effect row over the same value.

The nice part is that "where a value came from" is not extra bookkeeping you have to thread through by hand. It is already in the value, if you keep the value symbolic.

## checking it without running anything

Question: can you verify this without executing the extraction and then trusting the result you get? Answer: yes, because in effectful a program is a *term* before it is a value.

Every operation call routes through one universal `apply` operation. So instead of running `find_span` and `make_triple` for real, you interpret `apply` to build a term: `make_triple(find_span(...), "citizen_of", Span("Poland"))` becomes a tree, not a `Triple`. Then `check_requires` walks that tree, and at each `make_triple` node it asks: does the `subject` subterm mention `find_span` in its effect row? does the `object`? The first does. The second is a bare `Span("Poland")` the model constructed, whose row is empty, so it fails.

```python
check_requires(grounded)      # {}  -- every triple is grounded
check_requires(hallucinated)  # {make_triple: {'object': {find_span}}}  -- caught
```

This is the same machine that computes `typeof` and the free variables of a term, a fold over `apply`, with the accumulator swapped to "which operations produced this value." Fully static effect typing is basically impossible here, because handler selection and dispatch are so dynamic, so this is the dynamic version: you run the program's structure through the effect system itself, and read the answer off. Zero model calls to verify, and no ground truth.

One thing worth being honest about: an early version of this check ran the term through `evaluate`, which quietly executed any operation that had a real implementation, collapsing `find_span(...)` back to a concrete span and losing the provenance. It only looked correct because every test operation happened to be unimplemented. A provenance check must not run the effects it is guarding. The fixed version is a pure structural walk that never executes the program, and it descends into lists and dataclass fields too, since a real extractor returns a list of triples and the triples are dataclasses.

## making the LLM do it

The last step is to hand this to the model. The model does not call tools one at a time here. It *writes the extraction program* and submits it as its answer, which is the code-synthesis path (`SynthesizeAndCall`, the same idea as the `codeadapt` example). So the natural place for the check is right there: reify the function the model wrote, `check_requires` it, and if a triple is built from a span the model invented, reject the answer and feed the reason back so the model revises.

That is a small handler, `CheckProvenance`. It raises the framework's ordinary tool-execution error, so it plugs straight into the existing retry loop with no changes to the synthesis machinery. Here is a real `gpt-4o` run. Given "Marie Curie was born in Warsaw. Paris is the capital of France.", the model answers by writing:

```python
def extract(document):
    subject1 = find_span(document, 'Marie Curie')
    object1  = find_span(document, 'Warsaw')
    subject2 = find_span(document, 'Paris')
    object2  = find_span(document, 'France')
    return [make_triple(subject1, 'was born in', object1),
            make_triple(subject2, 'is the capital of', object2)]
```

Every span is found, so `CheckProvenance` accepts it and you get two grounded triples. When I loosened the prompt to invite world knowledge, the model built `Span("Poland")` for a country not in the text, and the check answered with the message the model then sees:

```
Ungrounded value(s) in your answer: argument 'object' of make_triple() must be a
value produced by find_span(), not one constructed directly.
```

The point is not that the model is honest. The point is that it physically cannot pass off an ungrounded triple: an unfound span is not the kind of value `make_triple` accepts, and the harness will not run the answer until it is. Grounding by construction, not by asking nicely.

## where this stops

Two honest limits. First, the check reads a synthesized *program*, where provenance is structural. It does not, on its own, ground values a model returns through eager JSON tool-calling, where a value comes back with no history attached. Second, it is a path-insensitive over-approximation of the reified program, so it wants the synthesized function to be straight-line over its operations. Both are the same underlying assumption: keep the interesting work in operations, and the effect system can see it.

The tidy thing is how little of this is about knowledge graphs. `find_span` and `make_triple` are stand-ins. The same `Requires` catches a taint-analysis violation, a capability you were not granted, an edit that did not go through the budgeted operation. It is one refinement type over the effect row, and the knowledge-graph case is just the one where "the model made that up" has an obvious cost.
