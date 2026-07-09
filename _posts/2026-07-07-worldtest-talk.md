---
layout: post
title: "WorldTest: how do we know whether an AI has learned how a world works?"
date: 2026-07-07 00:01:00
description: A linearized, story version of my TAIC'26 talk on benchmarking world-model learning with environment-level queries. With live environments you can play.
header_image: /assets/img/worldtest_talk/workshop_talk.jpg
---

I gave a talk on our ICML 2026 paper [Benchmarking World-Model Learning with Environment-Level Queries](https://arxiv.org/abs/2510.19788) at [TAIC'26 (Thinking about AI's Capability)](https://taic-workshop.github.io/), a pre-ICML workshop at GIST. This post is the talk, linearized: the same story, with the figures, the numbers, and the live environments embedded along the way. If you prefer the slide form, [the interactive deck is here](/assets/talks/worldtest/).

## What is a world model?

A **world model** is an agent's flexible, predictive, and counterfactual understanding of how its environment works. Cognitive science treats this kind of understanding as a core substrate of human intelligence ([Weisberg & Gopnik 2013, *Cognitive Science*](https://doi.org/10.1111/cogs.12069)), and many researchers argue that learning such models is pivotal for the next step in AI ([LeCun 2022](https://openreview.net/forum?id=BZ5a1r-kVsf)).

## Why it matters: the kitchen

Someone who cooks regularly builds an internal model of their kitchen: where tools live, how appliances behave. That one model is general-purpose. It supports many different everyday capabilities about the same environment, not just a single task:

- **Predict.** Estimate how long the hidden contents of a covered pot will take to finish cooking, from the steam and the elapsed time.
- **Adapt.** Recognize and adapt to changes in the kitchen, such as a knife that has been moved to a different drawer.
- **Plan.** Plan a sequence of actions to complete a set of recipes, ordering steps so everything comes together.

A good world model answers many such different questions about one environment. Hold on to these three capabilities; they come back as the benchmark's three task families.

## How do we currently evaluate world-model learning?

Four families of benchmarks each probe an agent's knowledge, and each captures something real while missing something essential.

**Non-interactive benchmarks** ([ARC](https://arxiv.org/abs/1911.01547), RAVEN, CLEVR variants) test whether you can infer hidden rules from a few static examples.

![Non-interactive evaluation: infer the rule from fixed examples](/assets/img/worldtest_talk/rw_noninteractive.gif)

They capture environment-level reasoning: rule induction, concept induction, causal reasoning. But you never act in the world. The data you learn from is fixed by the benchmark designer, not gathered by your own experiments.

**Representation-based approaches** (Moving MNIST, BAIR robot pushing, DiscoveryWorld, CLEVRER, CATER, CausalWorld) require a fixed output format, next frames, text descriptions, or predicate structures, scored by format-specific proxies.

![Representation-based evaluation: pixel error rewards the blurry hedge](/assets/img/worldtest_talk/rw_representation.gif)

The proxy measures fit to the format, not the world model. Reconstruction error famously rewards a blurry average of possible futures over a crisp, physically right prediction. And an agent whose knowledge lives in a policy, a program, or a plan cannot even enter the exam.

**Gym-like benchmarks** (Atari/ALE, OpenAI Gym, ProcGen, NetHack) provide decision-making with explicit rewards.

![Gym-like evaluation: the memorized script collapses when the layout shifts](/assets/img/worldtest_talk/rw_gym.gif)

Reward measures task success, not world-model quality: high performance may come from a memorized policy rather than a generalizable grasp of the environment's structure. ProcGen exists precisely because agents memorize levels.

**Unsupervised RL benchmarks** ([URLB](https://arxiv.org/abs/2110.15191)) are the closest relative of our setup: explore without objectives first, face downstream tasks second. But both phases run in the very same environment, and evaluation only ever sees action-reward sequences, so structural and counterfactual understanding goes untested.

![Unsupervised RL: two phases, one world, versus WorldTest's modified test environment](/assets/img/worldtest_talk/rw_url.gif)

## The key idea: environment-level queries

An **environment-level query** is a question about a property of the whole environment. Answering it requires understanding the underlying rules, not just replaying what was seen. Three examples:

- **Occlusion.** What is hidden behind an occlusion? Infer the parts of the environment you cannot directly see.
- **Change.** Detect a change in the environment's dynamics. Notice when a rule of the world has shifted.
- **Reachability.** Determine whether one state is reachable from another. Reason about the global structure of what is possible.

Readers from the program synthesis community will recognize the move we are about to make. Synthesis has a long tradition of learning through queries to an oracle: Angluin's membership and equivalence queries against a minimally adequate teacher ([Angluin 1987](https://doi.org/10.1016/0890-5401(87)90052-6)), counterexample-guided inductive synthesis in sketching ([Solar-Lezama et al. 2006](https://doi.org/10.1145/1168857.1168907)), and the general theory of oracle-guided inductive synthesis ([Jha & Seshia 2017](https://doi.org/10.1007/s00236-017-0294-5)). In all of these, the interface to knowledge is a query, and the answer never depends on how the learner represents what it knows.

We want the same leverage for evaluating world-model learners, with the roles reversed: the benchmark interrogates the agent. The catch is that a POMDP agent does not answer propositions; it only knows how to step in an environment. So we make stepping be the question: each query is reified as a task in a derived environment, and solving the task is answering the query. The evaluation never reads the model, only behavior.

## The WorldTest protocol

WorldTest is a two-phase, behavior-based protocol.

**Interaction phase.** We give the agent a reward-free environment \\( \mathcal{M} \\), a POMDP whose dynamics it does not know. It explores freely, with no external rewards; at any time it may reset to the initial state or proceed to the test. From its interaction history it constructs an internal model \\( \widehat{\mathcal{M}} \\), which can be any representation whatsoever: a program, a latent code, a neural net. The protocol never prescribes or inspects it.

**Test phase.** The protocol instantiates an environment-level query: it samples hidden task parameters \\( \xi \\) and transforms the base environment into a derived challenge environment with an explicit objective \\( R \\) and horizon \\( H \\):

$$ (\mathcal{M}', R, H) = \tau(\mathcal{M}, \xi), \quad \xi \sim P_{\Xi} $$

The score depends only on the agent's behavior in \\( \mathcal{M}' \\). Solving the task is answering the query.

![The WorldTest framework and its AutumnBench instantiation](/assets/talks/worldtest/media/autumnbench_overview.png)

Three properties fall out of this design: it is **representation-agnostic** (scored by behavior alone, so humans and AI compare on equal terms), **reward-free during learning** (interaction carries no signal to exploit), and the test happens in a **modified environment** (memorizing the training world is not enough).

## Try it yourself, right now

This is a live AutumnBench task, running on the real platform. Explore reward-free, reset whenever you want, then take the test:

<div style="width: 100%; max-width: 680px; margin: 1em auto;">
  <iframe src="https://autumn.basis.ai/task-selection?taskId=Y59YE&embedded=1" width="100%" height="440" style="border: 1px solid #d0d5dc; border-radius: 8px;" loading="lazy"></iframe>
</div>

More at [autumn.basis.ai](https://autumn.basis.ai).

## AutumnBench: 43 environments, 129 tasks

AutumnBench instantiates WorldTest with 43 interactive grid-world environments (grids from 3x3 to 25x25, 19 of them stochastic) and 129 tasks across three families, which are the kitchen's three capabilities, formalized:

- **Masked frame prediction** (Predict): predict the masked content of the final frame by choosing one of six options.
- **Change detection** (Adapt): one rule changes mid-test; report the earliest timestep at which it changed.
- **Planning** (Plan): drive the world into a target configuration with a sequence of actions.

The 20 environments in the [public release](https://zenodo.org/records/19498269) are all running below, right now. Every tile is its own Autumn interpreter (C++ compiled to WebAssembly) playing a random action stream. Click any world to take over; the robot backs off for a few seconds.

<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 1em 0;">
<iframe src="/talks/basis-2026/autumn-embed/?program=ants&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=BBQ&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=bottle&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=buoyancy&compact=1&bg=black&auto=1&autoclick=top" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=coins&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=disease&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=gravity&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=Gravity%203&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=grow&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=hatch&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=ice&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=lights&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=magnets&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=Mario&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=paint&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=particles&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=sand&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=space_invaders&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=waterplug&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
<iframe src="/talks/basis-2026/autumn-embed/?program=wind&compact=1&bg=black&auto=1" style="width:100%;height:150px;border:1px solid #2a2f3a;border-radius:4px;background:#10141c;" loading="lazy"></iframe>
</div>

## The Autumn language

Every environment above is a short program in Autumn, a functional reactive language for specifying causal interactions in 2D grids ([Das et al., POPL 2023](https://doi.org/10.1145/3571249)). One declarative specification drives both a text interface for AI agents and the browser GUI humans play, so the exact same world is played by both:

```lisp
; from sand.sexp: conditional rules
(on (clicked sandButton)
    (= clickType "sand"))
(on (& (clicked) (isFreePos click)
       (== clickType "water"))
    (= water (addObj water ...)))

; from ants.sexp: spatial, temporal, stochastic
(closest obj foods)
(filter (--> obj (! (intersects obj (prev ants))))
        (prev foods))
(randomPositions GRID_SIZE 2)
```

`(on cond body)` is the conditional rule form: the guard is evaluated against the current state each tick and the body fires when it holds. The stdlib adds spatial operators (`closest`, `intersects`), temporal reads (`prev`), and stochastic primitives (`randomPositions`).

## Result

We compared 517 human participants (recruited via Prolific, screened for attention and color blindness) against five frontier reasoning models: Claude 4 Sonnet, Gemini 2.5 Pro, Gemini 2.5 Flash, o3, and Qwen3-235b-a22b-thinking-2507.

![Aggregate scores over all AutumnBench problems: humans dominate every panel](/assets/talks/worldtest/media/results_scores.png)

Humans beat every model, on every task family. The average human per-environment score sits around 0.935, near the ceiling; the best models hover far below. One curious split in panel (a): models did better on stochastic environments than deterministic ones, while humans were nearly identical across both. The paper reports the split as an observation and does not attribute a cause.

## More compute is not the fix

Would spending more per problem close the gap? Rank the five models by cost-per-problem and check whether score climbs with budget. In 25 of 43 environments it does; in 18 of 43 (42%) it plateaus or decreases. No environment is solved perfectly by the cheapest model. By task: masked frame prediction improves in 16 of 43 environments, planning in 16, change detection in only 14.

Here is one environment from each regime, live. Left: mario, where model scores improve with compute on masked frame prediction and change detection. Right: bbq, one of four environments (with carrace, chinese_checkers, and crystallization) showing no improvement on any task; click the grill to light it, the yellow button to add gas.

<div style="display: flex; gap: 8px; margin: 1em 0;">
  <iframe src="/talks/basis-2026/autumn-embed/?program=Mario&compact=1&bg=black" style="flex:1;min-width:0;height:260px;border:1.5px solid #2d6a4f;border-radius:6px;background:#10141c;" loading="lazy"></iframe>
  <iframe src="/talks/basis-2026/autumn-embed/?program=BBQ&compact=1&bg=black" style="flex:1;min-width:0;height:260px;border:1.5px solid #c0392b;border-radius:6px;background:#10141c;" loading="lazy"></iframe>
</div>

In most cases more compute did not help. The bottleneck is algorithmic, not computational.

## Where the gap comes from: humans experiment

During exploration the agent can reset the environment to its initial state at will. Humans treat reset as an experimental tool. They reset at least once in every environment, and they spend about 12.5% of their unique actions on resets; every model spends less, from 7.1% (Gemini Flash) down to 1.4% (Claude).

![Reset share of actions per agent](/assets/img/worldtest_talk/reset_share.png)

More telling than how often is *how*. Take the action sequences immediately before and after each reset and compute their longest-common-subsequence ratio: replaying a similar sequence gives a ratio near 1, unstructured resets give a ratio near 0. Humans sit at 0.827 (median 0.900); every model sits far below, and the difference is statistically significant for each model.

![LCS ratio around resets per agent](/assets/img/worldtest_talk/lcs_ratio.png)

Rerunning a controlled variation of your last experiment is the signature of hypothesis testing, and it matches behavior documented in cognitive science: people "select strategies in an adaptive fashion that trades off their expected performance and cognitive effort" ([Coenen, Rehder & Gureckis 2015](https://doi.org/10.1016/j.cogpsych.2015.02.004)), and learners who freely interact with a physical system "selectively produced evidence that revealed the physical property consistent with their inquiry goal" ([Bramley, Gerstenberg, Tenenbaum & Gureckis 2018](https://doi.org/10.1016/j.cogpsych.2018.05.001)). One honest caveat, in the paper's own terms: this link is correlational; testing it causally would need designs that manipulate reset availability.

## Watch the winner learn

Here is what that looks like in practice. This is the top-scoring human on the mario planning task (score 0.985, the decisive winner among the twenty people who played it), and these are their five real exploration runs from the recorded data, played back time-compressed. The click pattern tells the story on its own: in run 1, all 16 clicks land in the final 13% of the run; in run 2, the first click comes 6% in; runs 3 to 5 use only 4, 1, and 1 clicks.

**Run 1: figure out the world.** One long run of pure navigation: arrows, platforms, coins, the enemy. Then, at the very end of the run, the discovery: clicking does something too. Sixteen clicks in quick succession, all in the last stretch.

![Run 1 of 5](/assets/img/worldtest_talk/mario_run1.gif)

**Run 2: experiment with the new tool.** They reset, and clicking starts almost immediately, ten clicks woven through a much shorter run. This is the reset-as-experiment pattern from the charts above, in the flesh: same setup, one new variable.

![Run 2 of 5](/assets/img/worldtest_talk/mario_run2.gif)

**Runs 3 to 5: consolidate and master.** The remaining runs get shorter and more economical: four clicks, then one, then one. By the end they are not exploring anymore; they are rehearsing.

<div style="display: flex; gap: 8px; margin: 1em 0;">
  <img src="/assets/img/worldtest_talk/mario_run3.gif" alt="Run 3 of 5" style="flex:1;min-width:0;">
  <img src="/assets/img/worldtest_talk/mario_run4.gif" alt="Run 4 of 5" style="flex:1;min-width:0;">
  <img src="/assets/img/worldtest_talk/mario_run5.gif" alt="Run 5 of 5" style="flex:1;min-width:0;">
</div>

They went on to score 0.985 on the test.

## The snake that "fell"

Now the model side of the same coin, from the released reasoning traces ([Zenodo](https://zenodo.org/records/17728515)). The environment is a snake: arrow keys set its direction, eating the pink food makes it grow. There is no gravity. It is running here, live; click the panel, then steer with the arrows:

<div style="max-width: 340px; margin: 1em auto;">
  <iframe src="/talks/basis-2026/autumn-embed/?program=Snake&compact=1&bg=black" style="width:100%;height:300px;border:1px solid #2a2f3a;border-radius:6px;background:#10141c;" loading="lazy"></iframe>
</div>

Claude 4 Sonnet explored this world, watched the snake drift after a noop, and formed a hypothesis:

> "Key observation: The green object ... has fallen down one row and the bottom part moved right one column. This looks like **gravity or falling behavior!**"

The truth: a prior key press had set the snake's latent direction. The evidence kept contradicting gravity, and the belief survived anyway:

> "Observation: Both left and right arrow keys don't move the falling green object."
>
> "Action taken: click 1 9 ... Result: MAJOR CHANGE! The green object has transformed!"

At the test, the model mapped the answer options onto the mask carefully, and then answered confidently from the wrong model, because its world model never contained the rule that the snake eats food and grows:

> "Option 3 looks most consistent with: vertical green object at column 2 ... pink object at row 1, col 3."

Every individual observation was correct. The causal attribution was wrong, it was never revised, and the final answer was wrong with high confidence.

## Side by side

The contrast generalizes beyond one environment. Here is Basis's own clip of an AI agent (left) and a human (right) interacting with the same Autumn environment:

![AI agent (left) versus human (right) in the same Autumn environment](/assets/talks/worldtest/media/trajectories/human_vs_ai_sidebyside.gif)

## Humans update their beliefs; models defend them

The snake story is one instance of a deeper pattern. Across the masked frame prediction tasks especially, reasoning models often fail to update their beliefs when the test-phase observations contradict the rules they learned. It is not that they fail to notice; the scratchpads show them registering the contradiction and then predicting from the original rules anyway.

Humans move the other way. Measured by perplexity, how surprised an agent is by what it sees next, humans reach lower normalized perplexity over the course of their interaction: their expectations sharpen as evidence accumulates. Their learning is targeted and calibrated, so when the world disagrees with them, they revise toward the rules that actually hold. That is what run 1 of the mario winner looks like from the inside: a hypothesis ("maybe clicking matters"), a burst of tests, a revised model, and a plan built on top of it.

## What the gap really means

The human advantage is not mainly about raw knowledge. It traces to two capabilities the models lack:

1. **Strategic experimental design.** Humans use resets and interventions to test hypotheses: they reset in every environment and replay similar action subsequences around resets. Models often skip resets entirely and spend almost none of their actions probing the world.
2. **Flexible belief updating.** Humans revise their beliefs under contradiction and reach lower perplexity over interaction. Models often keep relying on the rules they first committed to.

Closing the gap likely needs better priors and advances in strategic experimental design, uncertainty quantification, and flexible belief updating, not just more compute.

## The team

This is joint work by eleven authors across Basis Research Institute, DFKI, Harvard, Mila / Universite de Montreal, Cambridge, MIT, and Cornell: Archana Warrier, Dat Nguyen, Michelangelo Naim, Moksh Jain, Yichao Liang, Karen Schroeder, Cambridge Yang, Joshua B. Tenenbaum, Sebastian Vollmer, Kevin Ellis, and Zenna Tavares.

Paper: [arXiv:2510.19788](https://arxiv.org/abs/2510.19788) · Slides: [the interactive deck](/assets/talks/worldtest/) · Play: [autumn.basis.ai](https://autumn.basis.ai) · Interpreter: [BasisResearch/Autumn.cpp](https://github.com/BasisResearch/Autumn.cpp) · Baselines: [BasisResearch/MARAProtocol](https://github.com/BasisResearch/MARAProtocol)
