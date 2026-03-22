---
layout: post
title: "Grammars that generalize: a weekend hack on domain-invariant bird recognition"
date: 2026-03-22 10:00:00
description: What happens when you replace a linear classifier with a PCFG over spatial layout programs — and why the grammar itself turns out to be the domain invariance mechanism.
---

A few days ago, Duy and I were wondering: can you get domain generalization for free just by changing your classifier's inductive bias? No adversarial training, no MMD, no contrastive loss — just a different head architecture that *happens* to be domain-invariant by construction.

Turns out: yes. And the answer is a probabilistic context-free grammar.

Code is at [datvo06/NeuroSymbolicDG](https://github.com/datvo06/NeuroSymbolicDG). Checkpoints on [HuggingFace](https://huggingface.co/datvo06/neurosymbolic-da-results).

## The setup

Take CUB-DG: 200 bird species, 4 visual domains (Photo, Art, Cartoon, Paint). You train on 3 domains, test on the held-out one. The standard story is that you need some alignment loss to make features domain-invariant. The best published image-only method (CORAL) gets 49.9% avg. Add text (CITGM) and you get 53.6%.

We get **67.0%** with image only. The secret ingredient is a PCFG.

## The architecture

Nothing fancy in the backbone — it's a ResNet-50. The interesting bit is what sits on top:

```
ResNet-50 → 1×1 conv → k heatmaps → spatial_soft_argmax → primitives → PCFG → class scores
```

The concept bottleneck produces $k=8$ spatial primitives, each with a location $(c_x, c_y)$, a bounding box, and a confidence score. Think of them as "parts" — though the network decides what they are, not us.

The PCFG then scores each of the 200 classes by computing a weighted sum over *productions*: pairwise spatial relations between primitives.

$$W_y(x) = \sum_{p \in \mathcal{P}} w_{y,p} \cdot \beta_p(x)$$

where $\beta_p$ are relation scores (sigmoid/Gaussian over primitive coordinates) and $w_{y,p}$ are per-class production weights normalized by sparsemax. That's it. 344 productions (8 `has` + 6 relations $\times$ 56 ordered pairs), sparsemax zeroing out most of them so each class commits to a sparse set of spatial patterns.

If you squint, this is just a linear classifier — but over *spatial relation features* instead of raw backbone features, with sparsemax sparsity forcing each class to pick a small structural explanation.

## Why it works for domain generalization

Here's the punchline: a Painted robin and a Photo robin have different textures, colors, and rendering styles. But the beak is still above the breast, the wing is still left-of the tail, and the head is still near the body. The grammar scores these spatial relations, not pixel patterns. Domain shift changes what primitives *look like* (the backbone's problem) but not *where they are relative to each other* (the grammar's problem).

The grammar's compositional structure is inherently domain-invariant. We didn't design it that way — it just falls out of the inductive bias.

## The evidence

The cleanest experiment: same backbone, same data, same everything — just swap the PCFG head for a linear classifier (NoPCFG ablation):

| Method | Art | Cartoon | Paint | Avg |
|--------|-----|---------|-------|-----|
| NoPCFG+CDAN | 52.4% | 56.2% | 45.7% | 51.4% |
| **PCFG+CDAN** | **68.8%** | **71.8%** | **60.5%** | **67.0%** |
| Grammar $\Delta$ | +16.4 | +15.6 | +14.8 | **+15.6** |

+15.6pp from changing the classifier head. The gap is remarkably consistent across all targets.

## What doesn't work (and why that's interesting)

We tried a bunch of things to improve on top of the grammar. They all made it worse:

- **Adversarial alignment** (-5.5pp): DANN-style 3-way domain discriminator during training. The grammar already captures the right invariances; forcing feature alignment on top disrupts this.
- **Deeper grammar** (-4.2pp): Adding hierarchical sublayouts (depth-2). Overfits to source domain structure without improving transfer.
- **Production score alignment** (-12.9pp): MMD between production activations across source domains. Redundant — the grammar's compositional structure already aligns them.

The pattern is clear: the grammar IS the domain invariance mechanism. Every attempt to add explicit alignment on top is either redundant or harmful. This is a nice example of the right inductive bias doing more work than the right loss function.

## The effectful DSL

One fun implementation detail: the grammar is defined as a DSL using [effectful](https://github.com/BasisResearch/effectful) algebraic effects. The same program runs under different *handlers* that determine the semantics:

```python
# Same DSL expression, different interpretations
with handler(eval_handler):    score = grammar(class_idx)  # → Tensor (direct scoring)
with handler(inside_handler):  table = grammar(class_idx)  # → InsideTable (exact marginals)
with handler(symbolic_handler): tree = grammar(class_idx)  # → DerivNode (interpretable tree)
```

The eval handler gives you fast scoring for training. The inside handler gives you exact marginals via the inside algorithm (useful for adaptation with the full set of primitives). The symbolic handler extracts human-readable derivation trees showing which spatial relations each class uses. Same program, three interpretations — the algebraic effects pattern makes this clean.

In practice, we bypass effectful entirely for training via `forward_vectorized()` — pure tensor ops, \~26$\times$ faster. But the handler-based version is nice for interpretability and for when you need exact marginals.

## What's next

The grammar works because birds are compositional — they have parts with consistent spatial relationships. The natural question is: what else is compositional enough? Documents, diagrams, scenes with multiple objects, maybe even action recognition (body parts in motion). The framework is general; CUB-DG just happened to be the right benchmark to demonstrate it.

There's also the CLIP direction we explored (replacing ResNet with frozen CLIP ViT-L/14 + LLM-generated concept bank). It didn't work — 20% vs 69% — because the grammar needs features that are *trained* to produce good spatial primitives, not frozen patch tokens. But the idea of semantically meaningful primitives (named bird parts instead of anonymous heatmaps) is compelling and worth revisiting with a fine-tunable backbone.

The repo has everything: training scripts, all ablations, pretrained checkpoints on HuggingFace. If you have a compositional recognition task with domain shift, give the grammar a try.
