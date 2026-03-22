---
layout: post
title: "Grammars that generalize: a weekend hack on domain-invariant bird recognition"
date: 2026-03-22 10:00:00
description: Combining a small DSL with a neural network for image classification gives domain invariance for free.
---

Here's a question Duy and I were kicking around: what if you combined a small DSL with a neural network classifier and got domain invariance for free? No adversarial training, no MMD, no contrastive loss — just a different classifier head whose inductive bias *happens* to be domain-invariant by construction.

Turns out it works. We replaced a linear classification layer with a probabilistic context-free grammar over spatial layout programs and got +15pp on a hard fine-grained vision benchmark. The grammar doesn't know about domains. It just scores spatial relations between detected parts — and those relations don't change when you go from photos to paintings.

Code: [datvo06/NeuroSymbolicDG](https://github.com/datvo06/NeuroSymbolicDG). Checkpoints: [HuggingFace](https://huggingface.co/datvo06/neurosymbolic-da-results).

## One program, three semantics

The design principle is something that'll look familiar if you've done any work with abstract interpretation: define the grammar once as an effectful program, then choose your semantics at the call site.

The grammar is a DSL with five operations — `has(j)`, `rel(name, i, j)`, `conj`, `choice`, `score` — implemented using [effectful](https://github.com/BasisResearch/effectful) algebraic effects. The same program runs under different handlers:

```python
with handler(eval_handler):     score = grammar(class_idx)  # → Tensor
with handler(inside_handler):   table = grammar(class_idx)  # → InsideTable
with handler(symbolic_handler): tree  = grammar(class_idx)  # → DerivNode
```

The eval handler gives you a scalar score (fast, for training). The inside handler computes exact marginals via the inside algorithm (a sum-product computation over all derivations — useful when you need to marginalize over the full set of primitives). The symbolic handler extracts a human-readable derivation tree. Same program, three abstract domains.

This is the same pattern from [my earlier post on Bayesian synthesis]({% post_url 2026-01-23-bayesian-synthesis %}) — there we had MCMC over program structures with a PCFG prior. Here, the programs are spatial layout grammars and the data is images, but the birth/death/swap moves over derivation trees are the same idea. The PCFG thread connects the two projects.

(In practice, we bypass effectful for training via `forward_vectorized()` — pure tensor ops, ~26x faster. But the handler-based version is what makes the system compositional.)

## The concrete setup

Take CUB-DG: 200 bird species across 4 visual domains (Photo, Art, Cartoon, Paint). Train on 3 domains, test on the held-out one. Best published image-only method (CORAL): 49.9% avg. Best with image+text (CITGM): 53.6%.

We get **67.0%** with image only. Here's the pipeline:

```
ResNet-50 → 1×1 conv → k heatmaps → spatial_soft_argmax → primitives → PCFG → class scores
```

The concept bottleneck produces $k=8$ spatial primitives — each with coordinates $(c_x, c_y)$, a bounding box, and a confidence. The PCFG scores each class as a weighted sum over productions:

$$W_y(x) = \sum_{p \in \mathcal{P}} w_{y,p} \cdot \beta_p(x)$$

where $\beta_p$ are spatial relation scores (sigmoid/Gaussian functions over primitive coordinates) and $w_{y,p}$ are per-class production weights normalized by sparsemax. There are 344 productions total (8 `has` + 6 relations $\times$ 56 ordered pairs). Sparsemax zeros out most of them, so each class commits to a sparse structural explanation.

A concrete derivation for, say, a Robin might look like:

```
Robin ← score(0.82, rel("above", head, breast))
       + score(0.71, rel("near", beak, head))
       + score(0.45, rel("left_of", wing, tail))
       + score(0.38, has(legs))
```

Four active productions out of 344. The grammar says: "a Robin is a thing where the head is above the breast, the beak is near the head, the wing is left of the tail, and legs are present." That description works whether the bird is a photo, a painting, or a cartoon.

## The grammar as an abstraction

If you think about it in PL terms, the grammar weights define a *finite abstraction* of the image. You go from a continuous pixel space to a sparse vector of spatial relation scores — a very coarse summary. Domain shift is a transformation in the concrete (pixel) domain. But the grammar's abstraction is coarse enough to be invariant to it: "beak above breast" holds in photos and in oil paintings, even though the pixels are completely different.

This is why it works for domain generalization, and also why you can't improve it by adding alignment losses. The abstraction is already domain-invariant. Forcing additional invariance constraints (adversarial, MMD, etc.) just fights with the grammar's natural behavior.

## The evidence

Same backbone, same data, same everything — swap the PCFG head for a linear classifier:

| Method | Art | Cartoon | Paint | Avg |
|--------|-----|---------|-------|-----|
| NoPCFG+CDAN | 52.4% | 56.2% | 45.7% | 51.4% |
| **PCFG+CDAN** | **68.8%** | **71.8%** | **60.5%** | **67.0%** |
| Grammar $\Delta$ | +16.4 | +15.6 | +14.8 | **+15.6** |

+15.6pp from changing the classifier head. The gap is remarkably consistent across targets.

## What doesn't work (and why that's the point)

We tried several things to improve on top of the grammar. They all made it worse:

- **Adversarial alignment** (-5.5pp): 3-way domain discriminator during training. The grammar already captures the right invariances; forcing alignment disrupts this.
- **Deeper grammar** (-4.2pp): Hierarchical sublayouts (depth-2). Overfits to source domain structure.
- **Production score alignment** (-12.9pp): MMD between production activations across domains. Redundant with the grammar's compositional structure.

The pattern: the grammar IS the domain invariance mechanism. Every explicit alignment attempt is either redundant or harmful. The right inductive bias does more work than the right loss function.

## What's next

The grammar works because birds are compositional — parts with consistent spatial relationships. The natural question: what else is compositional enough? Documents, diagrams, multi-object scenes, maybe action recognition (body parts in motion). The framework is general; CUB-DG happened to be the right benchmark.

The repo has training scripts, all ablations, and pretrained checkpoints on HuggingFace. If you have a compositional recognition task with domain shift, give it a try.
