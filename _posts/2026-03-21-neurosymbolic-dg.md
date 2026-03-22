---
layout: post
title: "Grammars that generalize: trying to find domain-invariant bird recognition"
date: 2026-03-21 10:00:00
description: Combining a small DSL with a neural network for image classification gives domain invariance for free.
---

Here's a question [Duy](https://github.com/Duy-Nguyen-Duc) and I were kicking around: what if you combined a small DSL with a neural network classifier and the classifier head itself *happened* to be domain-invariant by construction? Not as a replacement for adaptation methods like CDAN — but as a much stronger starting point for them.

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

That's 344 productions total. Each class $y$ has its own weight vector $\mathbf{w}_y \in \mathbb{R}^{344}$, normalized by **sparsemax** ([Martins & Astudillo, 2016](https://arxiv.org/abs/1602.02068)). Sparsemax is the key sparsity mechanism: unlike softmax which assigns nonzero weight to everything, sparsemax produces *exact zeros*. Each class commits to a small set of active productions — typically 4-17 out of 344, with a mean of 8.

The class score is the weighted marginal over all productions:

$$W_y(x) = \sum_{p=1}^{344} \underbrace{[\text{sparsemax}(\mathbf{w}_y)]_p}_{\text{grammar weight}} \cdot \underbrace{\beta_p(x)}_{\text{spatial score}}$$

If you squint, this is a linear classifier — but over *spatial relation features* $\beta_p(x)$ instead of raw backbone features, with sparsemax forcing each class to pick a small structural explanation.

### Connection to neuro-symbolic scene understanding

This grammar is semantically similar to the visual reasoning programs used in work like Neural-Symbolic VQA ([Yi et al., 2018](https://arxiv.org/abs/1810.02338)) and the CLEVR ecosystem ([Johnson et al., 2017](https://arxiv.org/abs/1612.06890)). In those systems, a parser produces a symbolic program (e.g., `filter(red) → relate(left_of) → query(shape)`) that executes on a scene representation to answer questions. The programs are compositional, the scene representation is object-centric, and the spatial relations are symbolic.

Our DSL has the same flavor — `rel("above", p3, p1)` is not far from `relate(above, obj3, obj1)` in a CLEVR-style program. But there's a key difference in *how the semantics are given*:

- **CLEVR-style**: the semantics are **learned** — a neural module network or attention mechanism learns what "left_of" means from data. This is flexible but the learned semantics can overfit to the training distribution.
- **Ours**: the semantics are **given differentiably** — `above(i, j) = σ(λ(cy_j - cy_i - m))` is a fixed functional form with learnable parameters. The *shape* of the relation is specified (sigmoid on coordinate difference), but the *threshold and sharpness* adapt. This gives us a strong inductive bias: "above" really does mean "higher in the image," it can't drift to mean something else. And because this inductive bias is domain-agnostic — coordinate differences don't depend on rendering style — the grammar is domain-invariant by construction.

The tradeoff is expressiveness vs. invariance. Learned relation semantics can capture more complex patterns but may not transfer across domains. Fixed-form differentiable semantics transfer perfectly but can only express what the functional form allows. For spatial relations between detected parts, the sigmoid/Gaussian forms are expressive enough — and the domain invariance is worth it.

## The full pipeline on a real image

Here's the complete pipeline running on a Black-footed Albatross photo — from detected primitives through concept heatmaps to the grammar derivation:

![Full pipeline visualization]({{ '/assets/img/neurosymbolic_dg/full_pipeline_viz.png' | relative_url }})

Left: the 8 detected primitives overlaid on the input image. Middle: per-primitive concept heatmaps showing what each primitive attends to (bright = high activation). Right: the grammar's derivation for this class — 8 active productions out of 344, dominated by `contains` relations capturing part-whole nesting.

And here's what each grammar rule looks like spatially — the top 6 active productions visualized with their bounding boxes and relation arrows:

![Grammar rules with bounding boxes]({{ '/assets/img/neurosymbolic_dg/grammar_rules_viz.png' | relative_url }})

Each subplot shows one active production. The colored bounding boxes are the spatial extent of each primitive (estimated from heatmap variance), and the arrows show the spatial relation being scored. For this Albatross, the grammar is dominated by `contains` relations — different primitives detecting nested body regions (body contains wing-patch, body contains tail, etc.).

## Same primitives, different domains

The key claim is that the grammar's spatial structure transfers across visual domains. Here's the same species (Black-footed Albatross) across Photo, Art, and Cartoon renderings, with all 8 concept heatmaps:

![Cross-domain heatmaps]({{ '/assets/img/neurosymbolic_dg/cross_domain_heatmaps.png' | relative_url }})

The primitives detect similar spatial regions across domains — the heatmap patterns are consistent even though the pixel-level appearance changes dramatically. The grammar scores spatial relations between these primitives, and since the relations ("p0 contains p4", "p1 above p2") hold across all renderings, the grammar produces the same classification.

## What the grammar actually learns

Here's what the trained grammar looks like on real CUB-DG checkpoints. These are the *actual* sparsemax-normalized production weights extracted from our best model (PCFG+CDAN, trained on Photo+Cartoon+Paint, tested on Art).

Each class uses only 4-17 active productions out of 344. The grammar learns a sparse structural recipe for each bird species:

![Grammar productions per class]({{ '/assets/img/neurosymbolic_dg/grammar_productions.png' | relative_url }})

A few things to notice:
- **Different classes use different relations**: some are dominated by `above` (vertical spatial structure), others by `contains` (part-whole nesting), others by mixtures.
- **Sparsemax sparsity is real**: most classes use 7-9 productions. The grammar doesn't hedge across all 344 — it commits to a small structural explanation.
- **Productions reference specific primitive pairs**: `above(p1, p2)` means "primitive 1 is above primitive 2." The primitives are anonymous (the network decides what they detect), but the grammar locks in *which spatial relations between which pairs* define each class.

### Same grammar, every domain

The grammar weights are per-class, not per-domain. So the structural recipe for "Class 169" is identical whether the bird is a Photo, an Art painting, a Cartoon, or a Paint rendering. This is domain invariance by construction:

![Cross-domain grammar invariance]({{ '/assets/img/neurosymbolic_dg/cross_domain_grammar.png' | relative_url }})

The color coding shows relation types: red = `above`, green = `near`, teal = `contains`. The structural recipe doesn't change across domains — only the primitive detectors (backbone + bottleneck) adapt to the visual style. The grammar captures *what spatial structure defines each class*, and that structure is shared across all renderings.

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

The symbolic handler builds an explicit `DerivNode` tree — that's how we extract the derivation visualizations above.

Same program, three abstract domains. The algebraic effects pattern makes this clean: you never modify the grammar definition, just swap the handler.

This is the same pattern from [my earlier post on Bayesian synthesis]({% post_url 2026-01-23-bayesian-synthesis %}) — there we had MCMC over program structures with a PCFG prior. Here, the programs are spatial layout grammars and the data is images, but the birth/death/swap moves over derivation trees are the same idea.

(In practice, we bypass effectful for training via `forward_vectorized()` — pure tensor ops, ~26x faster. But the handler-based version is what makes the system compositional.)

## The concrete setup

Take CUB-DG ([Min et al., ECCV 2022](https://arxiv.org/abs/2209.14108)): 200 bird species across 4 visual domains (Photo, Art, Cartoon, Paint). Train on 3 domains, test on the held-out one. Best published image-only method, CORAL ([Sun & Saenko, 2016](https://arxiv.org/abs/1607.01719)): 49.9% avg. Best with image+text, CITGM: 53.6%.

We get **67.0%** with image only. Here's the full pipeline:

```
ResNet-50
  → 1×1 conv → k=8 heatmaps
  → spatial_soft_argmax → 8 primitives {(cx, cy, bbox, conf)}
  → PCFG: 344 productions, sparsemax weights per class
  → class scores → log-softmax
```

The concept bottleneck (the 1x1 conv + [spatial soft-argmax](https://kornia.readthedocs.io/en/latest/geometry.subpix.html)) forces the network to decompose its representation into $k=8$ spatially localized primitives. Each primitive has a location, bounding box, and confidence — the "atoms" that the grammar reasons over. No hand-designed primitive vocabulary; the primitives emerge from end-to-end training with the grammar objective.

## The grammar as an abstraction

If you think about it in PL terms, the grammar weights define a *finite abstraction* of the image. You go from a continuous pixel space to a sparse vector of spatial relation scores — a very coarse summary. Domain shift is a transformation in the concrete (pixel) domain. But the grammar's abstraction is coarse enough to be invariant to it: "beak above breast" holds in photos and in oil paintings, even though the pixels are completely different.

This is why it works for domain generalization, and also why you can't improve it by adding alignment losses. The abstraction is already domain-invariant. Forcing additional invariance constraints (adversarial, MMD, etc.) just fights with the grammar's natural behavior.

## The evidence

![CUB-DG results comparison]({{ '/assets/img/neurosymbolic_dg/fig1_cubdg_hero.png' | relative_url }})

Same backbone, same data, same everything — swap the PCFG head for a linear classifier:

![PCFG vs NoPCFG]({{ '/assets/img/neurosymbolic_dg/fig2_pcfg_vs_nopcfg.png' | relative_url }})

| Method | Art | Cartoon | Paint | Avg |
|--------|-----|---------|-------|-----|
| NoPCFG+CDAN | 52.4% | 56.2% | 45.7% | 51.4% |
| **PCFG+CDAN** | **68.8%** | **71.8%** | **60.5%** | **67.0%** |
| Grammar $\Delta$ | +16.4 | +15.6 | +14.8 | **+15.6** |

+15.6pp from changing the classifier head. The gap is remarkably consistent across targets.

## What doesn't work (and why that's the point)

We tried several things to improve on top of the grammar. They all made it worse:

![Negative results]({{ '/assets/img/neurosymbolic_dg/fig10_negative_results.png' | relative_url }})

- **Adversarial alignment** (-5.5pp): 3-way domain discriminator ([Ganin et al., 2016](https://arxiv.org/abs/1505.07818)) during training. The grammar already captures the right invariances; forcing alignment disrupts this.
- **Deeper grammar** (-4.2pp): Hierarchical sublayouts (depth-2). Overfits to source domain structure.
- **Production score alignment** (-12.9pp): MMD ([Gretton et al., 2012](https://jmlr.org/papers/v13/gretton12a.html)) between production activations across domains. Redundant with the grammar's compositional structure.

The pattern: the grammar IS the domain invariance mechanism. Every explicit alignment attempt is either redundant or harmful. The right inductive bias does more work than the right loss function.

## What's next

The grammar works because birds are compositional — parts with consistent spatial relationships. The natural question: what else is compositional enough? Documents, diagrams, multi-object scenes, maybe action recognition (body parts in motion). The framework is general; CUB-DG happened to be the right benchmark.

The repo has training scripts, all ablations, and pretrained checkpoints on HuggingFace. If you have a compositional recognition task with domain shift, give it a try.
