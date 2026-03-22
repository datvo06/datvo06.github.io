---
layout: post
title: "Grammars that generalize: a weekend hack on domain-invariant bird recognition"
date: 2026-03-21 10:00:00
description: Combining a small DSL with a neural network for image classification gives domain invariance for free.
---

Here's a question Duy and I were kicking around: what if you combined a small DSL with a neural network classifier and got domain invariance for free? No adversarial training, no MMD, no contrastive loss — just a different classifier head whose inductive bias *happens* to be domain-invariant by construction.

Turns out it works. We replaced a linear classification layer with a probabilistic context-free grammar over spatial layout programs and got +15pp on a hard fine-grained vision benchmark. The grammar doesn't know about domains. It just scores spatial relations between detected parts — and those relations don't change when you go from photos to paintings.

Code: [datvo06/NeuroSymbolicDG](https://github.com/datvo06/NeuroSymbolicDG). Checkpoints: [HuggingFace](https://huggingface.co/datvo06/neurosymbolic-da-results).

## The grammar

Let's start with the grammar itself, since that's the whole point.

A standard image classifier ends with a linear layer: backbone features $\to$ class logits. We replace that with a PCFG over a small layout DSL. The DSL has two sorts of terminals:

- **Existence**: $\texttt{has}(j)$ — "primitive $j$ is present" (returns its confidence $\in [0,1]$)
- **Relation**: $\texttt{rel}(r, i, j)$ — "primitive $i$ is in spatial relation $r$ to primitive $j$" (returns a soft score)

The spatial relations are scored by sigmoid/Gaussian kernels over detected primitive coordinates:

$$
\begin{aligned}
\texttt{above}(i, j) &= \sigma\bigl(\lambda_1 (cy_j - cy_i - m_1)\bigr) \\
\texttt{left\_of}(i, j) &= \sigma\bigl(\lambda_2 (cx_j - cx_i - m_2)\bigr) \\
\texttt{near}(i, j) &= \exp\bigl(-\|c_i - c_j\|^2 / 2\rho^2\bigr) \\
\texttt{aligned\_h}(i, j) &= \exp\bigl(-(cy_i - cy_j)^2 / 2\tau_1^2\bigr) \\
\texttt{aligned\_v}(i, j) &= \exp\bigl(-(cx_i - cx_j)^2 / 2\tau_2^2\bigr) \\
\texttt{contains}(i, j) &= \sigma\bigl(\lambda_3 \min(\text{margin}_{ij})\bigr)
\end{aligned}
$$

All parameters $(\lambda, m, \tau, \rho)$ are learnable — jointly optimized with the rest of the network. So the geometry of "above" and "near" adapts to the data; we don't hand-code thresholds.

Now, the **grammar**. Given $k=8$ primitive types and 6 relation types, the universal grammar enumerates all possible spatial constraints:

$$
\begin{aligned}
\texttt{Constraint} &\to \texttt{has}(p_j) && \text{for } j \in \{0, \ldots, 7\} && \text{(8 productions)} \\
\texttt{Constraint} &\to \texttt{rel}(r, p_i, p_j) && \text{for } r \in \mathcal{R},\; i \neq j && \text{(6 × 56 = 336 productions)} \\
\texttt{Layout}_y &\to \texttt{choice}(\texttt{score}(w_1, c_1), \ldots, \texttt{score}(w_{344}, c_{344})) && && \text{(marginalization)}
\end{aligned}
$$

That's 344 productions total. Each class $y$ has its own weight vector $\mathbf{w}_y \in \mathbb{R}^{344}$, normalized by **sparsemax** (Martins & Astudillo, 2016). Sparsemax is the key sparsity mechanism: unlike softmax which assigns nonzero weight to everything, sparsemax produces *exact zeros*. Each class commits to a small set of active productions — typically 3-8 out of 344.

The class score is the weighted marginal over all productions:

$$W_y(x) = \sum_{p=1}^{344} \underbrace{[\text{sparsemax}(\mathbf{w}_y)]_p}_{\text{grammar weight}} \cdot \underbrace{\beta_p(x)}_{\text{spatial score}}$$

If you squint, this is a linear classifier — but over *spatial relation features* $\beta_p(x)$ instead of raw backbone features, with sparsemax forcing each class to pick a small structural explanation.

## What a derivation looks like

Under the symbolic handler, we can extract the actual derivation tree that the grammar produces for each class. Here's what a Robin's grammar looks like after training (showing only the active productions — the ones sparsemax kept nonzero):

```
Layout("Robin")
├── score(0.82) ── rel("above", p₃, p₁)      "head is above breast"
├── score(0.71) ── rel("near", p₆, p₃)        "beak is near head"
├── score(0.45) ── rel("left_of", p₂, p₄)     "wing is left-of tail"
└── score(0.38) ── has(p₅)                     "legs are present"
```

Four productions out of 344. The grammar says: "a Robin is a thing where the head is above the breast, the beak is near the head, the wing is left of the tail, and legs are present." Note that the primitives ($p_0, \ldots, p_7$) are anonymous — the network decides what they detect; the labels ("head", "beak") are our post-hoc interpretation from visualizing the heatmaps.

Compare that to a Woodpecker, which might look like:

```
Layout("Woodpecker")
├── score(0.91) ── rel("above", p₃, p₁)       "head is above breast"
├── score(0.84) ── rel("aligned_v", p₆, p₃)   "beak is vertically aligned with head"
├── score(0.67) ── rel("contains", p₁, p₇)    "breast contains belly-patch"
└── score(0.52) ── has(p₄)                     "tail is present"
```

Different class, different spatial recipe, same grammar formalism. The beak-head relation changes from `near` to `aligned_v` (woodpeckers have long beaks aligned with their head axis). The `contains` relation captures the distinctive breast patch. These structural descriptions transfer across visual domains because they describe *where things are*, not *what they look like*.

Here's the critical observation: both derivations are valid whether the bird is rendered as a photograph, an oil painting, or a cartoon. The spatial relations — "above", "near", "aligned" — are invariant to rendering style. This is where the domain generalization comes from, and it falls out of the grammar's inductive bias without any explicit alignment objective.

## One program, three semantics

The design principle is something that'll look familiar if you've done any work with abstract interpretation: define the grammar once as an effectful program, then choose your semantics at the call site.

The grammar is implemented using [effectful](https://github.com/BasisResearch/effectful) algebraic effects. The five DSL operations — `has`, `rel`, `conj`, `choice`, `score` — are declared as algebraic effects via `@Operation.define`. The same grammar program runs under different handlers:

```python
with handler(eval_handler):     score = grammar(class_idx)  # → Tensor
with handler(inside_handler):   table = grammar(class_idx)  # → InsideTable
with handler(symbolic_handler): tree  = grammar(class_idx)  # → DerivNode
```

The eval handler interprets the DSL in the non-negative real semiring $(\mathbb{R}_{\geq 0}, +, \times, 0, 1)$ — `choice` is addition, `conj` is multiplication, `score` scales by the grammar weight. This gives you a scalar class score, fast.

The inside handler interprets the same program in the *powerset semiring* — tracking which subsets of primitives each subprogram explains. This is the [inside algorithm](https://en.wikipedia.org/wiki/Inside%E2%80%93outside_algorithm) adapted from strings to sets: $I(A, S) = \sum_{A \to B\;C} w \sum_{S = S_1 \uplus S_2} I(B, S_1) \cdot I(C, S_2)$. You get exact marginals over all derivations, useful for adaptation.

The symbolic handler builds an explicit `DerivNode` tree — that's how we extract the derivations shown above.

Same program, three abstract domains. The algebraic effects pattern makes this clean: you never modify the grammar definition, just swap the handler.

This is the same pattern from [my earlier post on Bayesian synthesis]({% post_url 2026-01-23-bayesian-synthesis %}) — there we had MCMC over program structures with a PCFG prior. Here, the programs are spatial layout grammars and the data is images, but the birth/death/swap moves over derivation trees are the same idea.

(In practice, we bypass effectful for training via `forward_vectorized()` — pure tensor ops, ~26x faster. But the handler-based version is what makes the system compositional.)

## The concrete setup

Take CUB-DG: 200 bird species across 4 visual domains (Photo, Art, Cartoon, Paint). Train on 3 domains, test on the held-out one. Best published image-only method (CORAL): 49.9% avg. Best with image+text (CITGM): 53.6%.

We get **67.0%** with image only. Here's the full pipeline:

```
ResNet-50
  → 1×1 conv → k=8 heatmaps
  → spatial_soft_argmax → 8 primitives {(cx, cy, bbox, conf)}
  → PCFG: 344 productions, sparsemax weights per class
  → class scores → log-softmax
```

The concept bottleneck (the 1x1 conv + soft-argmax) forces the network to decompose its representation into $k=8$ spatially localized primitives. Each primitive has a location, bounding box, and confidence — the "atoms" that the grammar reasons over. No hand-designed primitive vocabulary; the primitives emerge from end-to-end training with the grammar objective.

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
