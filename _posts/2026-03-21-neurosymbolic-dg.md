---
layout: post
title: "Grammars that generalize: trying to find domain-invariant bird recognition"
date: 2026-03-21 10:00:00
description: Combining a small DSL with a neural network for image classification gives domain invariance for free.
header_image: /assets/img/neurosymbolic_dg/thumbnail.png
---

Here's a question [Duy](https://github.com/Duy-Nguyen-Duc) and I were kicking around: what if you combined a small DSL with a neural network classifier and the classifier head itself *happened* to be domain-invariant by construction? Not as a replacement for adaptation methods like CDAN, but as a much stronger starting point for them.

Turns out it works. We replaced a linear classification layer with a probabilistic context-free grammar over spatial layout programs. The grammar scores spatial relations between detected parts, and those relations don't change when you go from photos to paintings. We call this **PARSE** (Primitive-Aware Relational Structure for domain gEneralization); paper at [arXiv:2605.06043](https://arxiv.org/abs/2605.06043).

Code: [datvo06/NeuroSymbolicDG](https://github.com/datvo06/NeuroSymbolicDG). Checkpoints: [HuggingFace](https://huggingface.co/datvo06/neurosymbolic-da-results).

## The setup and the result

The benchmark is CUB-DG ([Min et al., ECCV 2022](https://arxiv.org/abs/2209.14108)): 200 bird species across 4 visual domains (Photo, Art, Cartoon, Paint). Train on 3 domains, test on the held-out one. Best published image-only method, CORAL ([Sun & Saenko, 2016](https://arxiv.org/abs/1607.01719)): 49.9% avg. Best with image+text, CITGM: 53.6%. We get **67.0%** with image only.

<img src="{{ '/assets/img/neurosymbolic_dg/fig1_cubdg_hero.png' | relative_url }}" alt="CUB-DG results comparison" style="max-width: 100%; height: auto;">

The pipeline:

```
ResNet-50
  → 1×1 conv → K=16 heatmaps
  → spatial_soft_argmax → 16 primitives {(cx, cy, bbox, conf)}
  → PCFG: ~130k enumerated productions, sparsemax weights per class
  → class scores → log-softmax
```

The concept bottleneck (1x1 conv + [spatial soft-argmax](https://kornia.readthedocs.io/en/latest/geometry.subpix.html)) forces the network to decompose its representation into K = 16 spatially localized primitives. Each primitive has a location, bounding box, and confidence. No hand-designed primitive vocabulary; the primitives emerge from end-to-end training.

Per the paper's Table 1a, CUB-DG accuracy by target domain:

<table style="border-collapse: collapse; margin: 1em 0; font-size: 0.95em;">
  <thead>
    <tr style="border-bottom: 2px solid #444;">
      <th style="text-align: left; padding: 0.4em 0.8em;">Method</th>
      <th style="padding: 0.4em 0.8em;">Photo</th>
      <th style="padding: 0.4em 0.8em;">Cartoon</th>
      <th style="padding: 0.4em 0.8em;">Art</th>
      <th style="padding: 0.4em 0.8em;">Paint</th>
      <th style="padding: 0.4em 0.8em;">Avg</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 0.4em 0.8em;">CORAL (<a href="https://arxiv.org/abs/1607.01719">Sun &amp; Saenko, 2016</a>)</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">72.2</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">63.5</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">50.3</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">35.8</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">55.5</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 0.4em 0.8em;">GVRT</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">74.6</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">64.2</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">52.2</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">37.0</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">57.0</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 0.4em 0.8em;">ERM++ (prior best)</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">60.3</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">61.6</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">56.8</td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>65.8</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;">61.1</td>
    </tr>
    <tr style="background: #f3f5fb;">
      <td style="padding: 0.4em 0.8em;"><strong>PARSE</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>75.7</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>69.1</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>68.2</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;">49.3</td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>65.6</strong></td>
    </tr>
  </tbody>
</table>

+4.5pp over ERM++ on average. The gain concentrates on the harder stylistic domains (Photo, Cartoon, Art); Paint regresses (PARSE 49.3 vs ERM++ 65.8), which I discuss later. Now let me explain what that classifier head actually is.

Same backbone, same data, same everything. Vary the predicate arities the head can use:

<img src="{{ '/assets/img/neurosymbolic_dg/fig2_arity_ablation.png' | relative_url }}" alt="Predicate-arity ablation" style="max-width: 100%; height: auto;">

## The grammar

A standard classifier ends with a linear layer: backbone features $\to$ class logits. We replace that with a PCFG over a small layout DSL. The DSL has one unary terminal and three families of relations:

- **Existence** (unary): `has` returns the confidence that a primitive is present.
- **Binary relations** (6): `above`, `left_of`, `near`, `aligned_h`, `aligned_v`, `contains`. Score pairwise spatial constraints between two primitives.
- **Ternary relations** (2): `tri` (target interior angle of a triangle of three primitives) and `turn` (target turn angle along a primitive chain).
- **Quaternary relations** (2): `orient` (target relative orientation between two primitive-pair edges) and `eqdist` (whether the two edges have similar length, via a log-ratio).

**Binary predicates.** The six binary predicates are sigmoid (directional, containment) or Gaussian (proximity, alignment) over primitive centers and soft bounding boxes:

$$
\begin{aligned}
R_{\text{above}}(p_i, p_j) &= \sigma\!\left(\kappa_{\uparrow} (c_j^y - c_i^y - m_{\uparrow})\right)
& R_{\text{left}}(p_i, p_j) &= \sigma\!\left(\kappa_{\leftarrow} (c_j^x - c_i^x - m_{\leftarrow})\right) \\\\
R_{\text{h-align}}(p_i, p_j) &= \exp\!\left(-\dfrac{(c_i^y - c_j^y)^2}{2\tau_h^2}\right)
& R_{\text{v-align}}(p_i, p_j) &= \exp\!\left(-\dfrac{(c_i^x - c_j^x)^2}{2\tau_v^2}\right)
\end{aligned}
$$

$$
\begin{aligned}
R_{\text{near}}(p_i, p_j)     &= \exp\!\left(-\dfrac{\|c_i - c_j\|^2}{2\rho^2}\right) \\\\
R_{\text{contains}}(p_i, p_j) &= \sigma\!\left(\kappa_{\supset} \min\!\bigl[b_j^{x_1} - b_i^{x_1},\, b_j^{y_1} - b_i^{y_1},\, b_i^{x_2} - b_j^{x_2},\, b_i^{y_2} - b_j^{y_2}\bigr]\right)
\end{aligned}
$$

$R_\mathrm{above}$ and $R_\mathrm{left}$ score directional positions; $R_\mathrm{h\text{-}align}$ and $R_\mathrm{v\text{-}align}$ score whether two primitives share a horizontal or vertical line; $R_\mathrm{near}$ scores proximity; $R_\mathrm{contains}$ scores whether the soft bounding box of $p_i$ encloses that of $p_j$. Sharpness $\kappa$ and margins $m$, $\tau$, $\rho$ are learnable.

**Ternary predicates.** Each predicate is a soft Gaussian on a target angle of a primitive triple:

$$
\begin{aligned}
R_{\text{tri}}(p_i, p_j, p_k) &= \exp\!\left(-\dfrac{(\alpha_{ijk} - \psi)^2}{2\beta^2}\right)
& R_{\text{turn}}(p_i, p_j, p_k) &= \exp\!\left(-\dfrac{(\theta_{ijk} - \phi)^2}{2\eta^2}\right)
\end{aligned}
$$

where

$$
\alpha_{ijk} = \text{interior angle at } p_i \text{ in the triangle } (p_i, p_j, p_k), \qquad \theta_{ijk} = \arccos(\hat{v}_{ij} \cdot \hat{v}_{jk}) \text{ along the chain } p_i \to p_j \to p_k.
$$

$R_\mathrm{tri}$ scores triangular configurations against a target interior angle $\psi$; $R_\mathrm{turn}$ scores chain turns against a target turn angle $\phi$.

**Quaternary predicates.** Two primitive pairs are compared via their directed edges,

$$
v_{ij} = c_j - c_i, \qquad v_{k\ell} = c_\ell - c_k.
$$

$$
\begin{aligned}
R_{\text{orient}}(p_i, p_j, p_k, p_\ell) &= \exp\!\left(-\dfrac{(\hat{\mathbf{v}}_{ij} \cdot \hat{\mathbf{v}}_{k\ell} - \cos\varphi)^2}{2\gamma^2}\right) \\\\
R_{\text{eqdist}}(p_i, p_j, p_k, p_\ell) &= \exp\!\left(-\dfrac{1}{2\tau_d^2} \log^2\!\dfrac{\|\mathbf{v}_{ij}\|}{\|\mathbf{v}_{k\ell}\|}\right)
\end{aligned}
$$

$R_\mathrm{orient}$ scores whether the two edges form a target relative angle $\varphi$; $R_\mathrm{eqdist}$ scores whether the two edges have similar length (the log-ratio form makes the comparison symmetric). Both are pose-and-scale invariants by construction.

All shape parameters (sharpness $\kappa$, margins $m$, tolerances $\tau$, $\rho$, target angles $\psi$, $\phi$, $\varphi$, and tolerances $\beta$, $\eta$, $\gamma$, $\tau_d$) are learnable and jointly optimized with the rest of the network. The *form* of each predicate is locked in but the thresholds adapt.

Given $K = 16$ primitives and the predicate vocabulary above, the grammar enumerates all valid spatial compositions (binary applied to ordered pairs, ternary to ordered triples, quaternary to ordered quadruples):

$$
\begin{aligned}
\text{Constraint} &\to \text{has}(p_j) \\\\
\text{Constraint} &\to \text{rel}(r, p_i, p_j) \\\\
\text{Constraint} &\to \text{rel}_3(r, p_i, p_j, p_k) \\\\
\text{Constraint} &\to \text{rel}_4(r, p_i, p_j, p_k, p_\ell) \\\\
\text{Layout}_y   &\to \text{choice}\bigl(\text{score}(w_1, c_1), \ldots, \text{score}(w_M, c_M)\bigr)
\end{aligned}
$$

The total number of enumerated productions $M$ depends on $K$ and on how many channels each higher-arity predicate spans; for CUB-DG, $M \approx 130{,}000$ (paper Table 2b). Each class $y$ has its own weight vector $\mathbf{w}_y \in \mathbb{R}^M$, normalized by **sparsemax** ([Martins & Astudillo, 2016](https://arxiv.org/abs/1602.02068)). Sparsemax produces *exact zeros*, so each class commits to a small set of active productions: on CUB-DG, structural compaction prunes 99.3% of weights and leaves $\sim 956$ active per class on average (paper Table 2b). The class score is

$$
\begin{aligned}
W_y(x) &= \sum_{p=1}^{M} \omega_{y,p} \cdot \beta_p(x) \\\\
\text{where } \omega_{y,p} &= [\mathrm{sparsemax}(\mathbf{w}_y)]_p \quad \text{(grammar weight)} \\\\
\beta_p(x) &= \text{predicate activation for production } p
\end{aligned}
$$

If you squint, this is a linear classifier over *spatial relation features* with sparsemax forcing each class to pick a small structural explanation. Here's what that looks like on a real image, a Painted Bunting, from detected primitives through heatmaps to the grammar derivation:

<img src="{{ '/assets/img/neurosymbolic_dg/full_pipeline_viz.png' | relative_url }}" alt="Full pipeline visualization" style="max-width: 100%; height: auto;">

And the top 6 grammar rules visualized spatially with bounding boxes:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_rules_viz.png' | relative_url }}" alt="Grammar rules with bounding boxes" style="max-width: 100%; height: auto;">

Every class learns a distinct grammar. Here are 5 maximally diverse species, picked by greedy selection to minimize mutual cosine similarity:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_diversity.png' | relative_url }}" alt="Grammar diversity across 5 species" style="max-width: 100%; height: auto;">

All 200 classes have unique active production sets (0 identical pairs), with a mean pairwise cosine similarity of just 0.04:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_overlap.png' | relative_url }}" alt="Grammar overlap matrix" style="max-width: 100%; height: auto;">

The grammar learns genuinely distinct structural descriptions per species, not a one-size-fits-all template. And since the weights are per-class not per-domain, the structural recipe for each species is identical across Photo, Art, Cartoon, and Paint. Domain invariance by construction.

## Why it works

As a motivating example, consider the same bird species in Photo and Cartoon. The local parts (eyes, beak, wings) shift in appearance, with flattened colors, simplified textures, missing specular highlights. But their coarse spatial organization is invariant. The beak still lies near the eyes along the head; the wings still sit in characteristic positions relative to the body. A classifier that reads off "beak near eyes, wings to the side of body" gets the same signal in both domains; a classifier that reads off pixels does not.

In PL terms, the grammar weights define a *finite abstraction* of the image. You go from a continuous pixel space to a sparse vector of spatial-predicate scores, a coarse summary. Domain shift is a transformation in the concrete (pixel) domain. The grammar's abstraction is coarse enough to be invariant to it: "beak near eyes" and "wings beside body" hold in photos and in cartoons even though the pixels look nothing alike.

Here's the same species across Photo, Art, and Cartoon. The heatmap patterns are consistent despite dramatic appearance changes:

<img src="{{ '/assets/img/neurosymbolic_dg/cross_domain_heatmaps.png' | relative_url }}" alt="Cross-domain heatmaps" style="max-width: 100%; height: auto;">

The grammar also discovers on its own *which* relations are domain-invariant:

<img src="{{ '/assets/img/neurosymbolic_dg/relation_usage.png' | relative_url }}" alt="Relation usage analysis" style="max-width: 100%; height: auto;">

`contains` dominates (94% of classes), `above` is second (84%), `left_of` drops to 39%. Why? `contains` (really soft overlap; the bounding boxes are too diffuse for true containment) is pose-invariant: two overlapping primitives stay overlapping regardless of orientation. `above` holds reliably across poses. But `left_of` is pose-dependent: a bird facing left has its beak left-of-body; facing right, it's reversed. The training data includes random horizontal flips, so the grammar learns to avoid it. Nobody told it `left_of` is unreliable. Sparsemax drove it to zero.

This is also why you can't improve it by adding alignment losses. The abstraction is already domain-invariant. Forcing additional constraints just fights with the grammar's natural behavior.

### Connection to neuro-symbolic scene understanding

The grammar is semantically close to the visual reasoning programs in Neural-Symbolic VQA ([Yi et al., 2018](https://arxiv.org/abs/1810.02338)) and the CLEVR ecosystem ([Johnson et al., 2017](https://arxiv.org/abs/1612.06890)). Our $\mathrm{rel}(\text{above}, p_3, p_1)$ is not far from $\mathrm{relate}(\text{above}, \mathrm{obj}_3, \mathrm{obj}_1)$ in a CLEVR-style program. One key difference in the semantics:

- **CLEVR-style**: the semantics are *learned*. A neural module fits what "left_of" means from data. Flexible, but the relation itself can overfit to the source distribution.
- **Ours**: the semantics are *given differentiably*. $R_\mathrm{above}(p_i, p_j) = \sigma(\kappa (c_j^y - c_i^y - m))$ is a fixed functional form with learnable parameters. The *shape* of the relation is locked in ("above" really means "higher"); only the sharpness and margin adapt. Same shape for binary, ternary, and quaternary predicates: the form is hand-specified, the thresholds train. This is what makes the structural prior domain-invariant by construction.

The tradeoff is expressiveness for invariance. For spatial relations between detected bird parts the sigmoid / Gaussian / cosine forms are expressive enough, and the invariance is worth it.

## One program, several semantics

We declare the grammar as a program over [effectful](https://github.com/BasisResearch/effectful) algebraic ops once, then bind it to several different interpreters. The DSL surface is concrete:

```python
# neurosymbolic_da/dsl/ops.py
@defop
def has(type_idx: int) -> Tensor: ...
@defop
def rel(name: str, a: int, b: int) -> Tensor: ...
@defop
def conj(c1: Tensor, c2: Tensor) -> Tensor: ...
@defop
def choice(*alternatives: Tensor) -> Tensor: ...
@defop
def score(weight: Tensor, body: Tensor) -> Tensor: ...

# higher-arity ops (paper §3 ternary / quaternary)
@defop
def angle_rel(r1, r2, channel): ...     # quaternary: angle between two pair-edges
@defop
def same_distance(r1, r2): ...          # quaternary: equal pair distances
@defop
def triplet_rel(r1, r2, r3, channel): ... # ternary: triangle geometry
@defop
def chain_rel(...): ...
@defop
def betweenness(...): ...
@defop
def cross_ratio(...): ...
@defop
def group_rel(...): ...
```

Each `@defop` declares an *unhandled* operation. The same `grammar(class_idx)` program runs under different handlers:

```python
with handler(make_eval_handler(env, params)):
    score = grammar(class_idx)              # → Tensor (forward training)
with handler(inside_handler):
    table = grammar(class_idx)              # → InsideTable (exact marginals)
with handler(symbolic_handler):
    tree  = grammar(class_idx)              # → DerivNode (visualization)
with handler(abstract_handler):
    bound = grammar(class_idx)              # → IntervalBound (robustness analysis)
```

The handlers live in `dsl/handlers/` as `eval.py`, `inside.py`, `symbolic.py`, `abstract.py` (plus `cad_eval.py`/`cad_symbolic.py` for the CAD-style sub-language). One concrete design note worth flagging: the eval handler *does not* dispatch `rel` and `has` directly. They stay as unevaluated `Term`s and get evaluated on demand by `score` / `choice` / `conj`. This is what lets the higher-arity ops (`angle_rel`, `same_distance`, etc.) inspect the `Term.args` of their `rel` inputs and pull out the primitive indices they need, without forcing the `rel` to be evaluated to a scalar first. Without this trick, you cannot write a quaternary predicate over two binary `rel` calls without either (a) running `rel` twice and losing the index information, or (b) hand-wiring the indices outside the DSL.

Concretely, the three main semantics are:

- **eval**: maps each op to a non-negative real. `choice` is sum, `conj` is product, `score` multiplies by the grammar weight. Forward-pass training is just `evaluate(grammar(y))` under this handler. (Algebraically, this is the standard non-negative real interpretation: addition, multiplication, identities 0 and 1.)
- **inside**: indexes intermediate values by *which subset of primitives* the subprogram covers, then sums weighted contributions across all assignments. Concretely, for each nonterminal A and primitive subset S,

$$
I(A, S) = \sum_{A \to B\;C} w \sum_{S = S_1 \uplus S_2} I(B, S_1) \cdot I(C, S_2)
$$

  This is the same kind of bottom-up dynamic program as the [inside algorithm](https://en.wikipedia.org/wiki/Inside%E2%80%93outside_algorithm) for context-free grammars on strings, with one change: the yield is a subset rather than a substring, so the split `S = S_1 ⊎ S_2` ranges over disjoint partitions of the covered set instead of contiguous substrings. The algebra is still ordinary `+` and `×`; the subset index is what differs from the eval handler. We use this to read off the exact contribution of each primitive subset to a class score, which is how the per-derivation visualizations are computed.
- **symbolic**: doesn't reduce the program at all; it returns an effectful `Term` tree. The `DerivNode` view rendered earlier in the post is built by walking that tree.

The forward path used at training time is `forward_vectorized()` (`dsl/grammar.py:838`), which sidesteps the handler dispatch and computes the same eval-handler output via a fused tensor kernel. The code comment on `scripts/train_hybrid.py:108` notes it is "same as inside algorithm but ~26x faster via tensor ops." (To be precise: at depth-1 the inside and eval outputs agree, and `forward_vectorized` matches both.) The handler-based versions are what we use for analysis and non-standard semantics; the vectorized path is what makes training tractable.

The recurring shape (one program, multiple semantics via handlers) is the same pattern I used in [my earlier post on Bayesian synthesis]({% post_url 2026-01-23-bayesian-synthesis %}). Different domain, same machinery.

## What doesn't work, and what that tells us

We tried several things to improve on top of the grammar. They all made it worse:

<img src="{{ '/assets/img/neurosymbolic_dg/fig10_negative_results.png' | relative_url }}" alt="Negative results" style="max-width: 100%; height: auto;">

- **Adversarial alignment** (-5.5pp): 3-way domain discriminator ([Ganin et al., 2016](https://arxiv.org/abs/1505.07818)). The grammar already captures the right invariances; forcing alignment disrupts this.
- **Deeper grammar** (-4.2pp): Hierarchical sublayouts (depth-2). Overfits to source domain structure.
- **Production score alignment** (-12.9pp): MMD ([Gretton et al., 2012](https://jmlr.org/papers/v13/gretton12a.html)) between production activations across domains. Redundant with the grammar's compositional structure.

Now let me be honest about what this all means.

**"It's just a kernel machine with hand-designed spatial features and sparsemax. Why call it a grammar?"** Partly fair. At depth-1, the PCFG is a flat weighted sum over a fixed predicate-application set (~130k productions for CUB-DG, pruned to ~956 active per class after sparsemax). No recursion, no hierarchical derivation. You could rewrite the whole thing as `class_score = sparsemax(W) @ predicate_features(x)` and it would be mathematically identical. So why the grammar framing?

Real higher-order composition (productions over productions, a binary relation feeding another binary relation) doesn't fit a neural training loop. The parameter count blows up and gradients through stacked discrete-ish choices get noisy. Our move was to approximate that higher-order structure with explicit ternary and quaternary predicates: instead of letting the grammar recursively compose binary relations into compound relations, we enumerate a small set of higher-arity primitives that matter (triangle angles, chain turns, two-pair orientation, two-pair distance ratio) and let sparsemax pick which ones each class uses. The compositional depth lives in the predicate arity, not the derivation depth.

The grammar framing is what produced the design either way. "Enumerate predicate applications and let sparsemax pick a sparse subset per class" is a natural move once you think in terms of productions. If we'd started from "design some spatial kernel features", we probably wouldn't have ended up with the handler-based architecture.

Call it a spatial-predicate feature selector with sparsemax if you want. The results are the same.

**"The depth-2 result is the most interesting finding."** Agreed. "Depth-2" in our setup means stacking a learned grouping layer over the depth-1 predicate scores. That hurt on CUB-DG because the *specific way* parts group in photos doesn't transfer to cartoons; the grouping layer overfits to the source-domain composition. The flat version avoids this by not committing to any grouping. Real recursive composition (productions over productions) we couldn't train usefully with backprop anyway. Where we did want higher-order structure, we baked it into the predicate vocabulary directly: ternary and quaternary predicates carry the compositional depth, so the derivation can stay flat. Whether some other domain needs a different higher-arity set is open.

**"The ablation confounds architecture and features."** A fair concern, and the paper runs the clean version of it. Table 2a holds the concept bottleneck fixed and varies only the predicate vocabulary: No Rel → Binary → +Ternary → +Quaternary → All. The *No Rel* baseline uses the same primitive-detector bottleneck but feeds the descriptors straight into a linear classifier, no spatial predicates. Going from No Rel to All gives +2.7pp on average (62.9 → 65.6), with the largest gain on Photo (+3.4) and the smallest on Paint (+1.9). That is the structural-prior delta, isolated from the bottleneck delta. The headline +4.5pp over ERM++ on CUB-DG is the combined effect of both inductive biases; the +2.7pp is the part you can attribute specifically to the predicate vocabulary.

**"How does this compare to concept bottleneck models?"** Two differences from standard CBMs ([Koh et al., 2020](https://arxiv.org/abs/2007.04612)). First, supervision: a CBM is trained against a predefined vocabulary of human-interpretable concepts with *concept-level* labels. PARSE is trained only with image-level class labels; the primitives emerge from end-to-end optimization, no concept supervision. Second, what sits on top: a CBM feeds an attribute vector into a linear classifier ("which concepts are present?"). PARSE feeds *localized* primitives (with spatial coordinates) into a structural scoring layer that evaluates binary, ternary, and quaternary spatial predicates ("how are the primitives spatially arranged?"). For fine-grained species recognition the arrangement is what discriminates classes, not just the presence of parts: all birds have beaks and wings; what differs is *where* they are relative to each other.

**"Show me this on CLEVR or something with real compositional structure."** Fair ask. CUB-DG has compositional structure (bird parts plus spatial relations) but it isn't CLEVR-style multi-step relational reasoning. The paper's broader generalization story leans on DomainBed instead: PARSE hits 66.7% average across PACS / VLCS / OfficeHome / TerraIncognita / DomainNet (Table 1b), best on TerraIncognita by +3.6pp. That argues the structural prior is not just a CUB-DG artifact. We also built a synthetic compositional benchmark (SCB) in the repo (`neurosymbolic_da/data/scb.py` + PMCMC adaptation in `training/pmcmc.py`) to stress-test the compositional part directly; the grammar's advantage there is much larger than on CUB-DG. SCB is not in the paper itself, it is an internal diagnostic. A CLEVR-DG benchmark (CLEVR scenes with rendering-style domain shift) would be the right external test for genuine compositional domain invariance, and as far as I know it does not exist yet.

**"The `contains` relation doesn't contain."** As discussed, the bounding boxes are too diffuse for true containment. What the model calls `contains` is better described as "asymmetric soft overlap." The name is misleading, but the function is still useful.

## What's next

The grammar works on CUB-DG because birds are compositional: parts with consistent spatial relationships. Same should hold for documents, diagrams, multi-object scenes, maybe action recognition. The framework is general; this is the benchmark we had.

The depth-2 result is the part I'd most want someone else to push on. Pairwise predicates plus a small higher-arity set seem to cover what matters for birds, but I'd expect that to break on tasks with multi-scale structure (macro vs micro photography, say), where you really need group-level relations: "these parts form a unit at this scale". I don't know what that benchmark looks like yet.

Repo has training scripts, ablations, and pretrained checkpoints on HuggingFace. If you have a compositional recognition task with domain shift, try it.
