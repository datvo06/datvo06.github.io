---
layout: post
title: "WorldTest: how do we know whether an AI has learned how a world works?"
date: 2026-07-07 00:01:00
description: A linearized, story version of my TAIC'26 talk on benchmarking world-model learning with environment-level queries. With live environments you can play.
header_image: /assets/img/worldtest_talk/workshop_talk.jpg
_styles: >
  .post img, .post video { max-width: 100%; height: auto; }
  .post iframe { max-width: 100%; }
  .post .chartbox { position: relative; width: 100%; height: 320px; margin: 0.6em 0; }
---

I gave a talk on our ICML 2026 paper [Benchmarking World-Model Learning with Environment-Level Queries](https://arxiv.org/abs/2510.19788) at [TAIC'26 (Thinking about AI's Capability)](https://taic-workshop.github.io/), a pre-ICML workshop at GIST. This post is the talk, linearized: the same story, with the figures, the numbers, and the live environments embedded along the way. If you prefer the slide form, [the interactive deck is here](/assets/talks/worldtest/).

## The contexts surrounding world modelings

Recently, world models have been at the center of many discussions in AI, and the discussions come in two kinds. The first is about building them: [Ha & Schmidhuber](https://arxiv.org/abs/1803.10122) made the modern case for learning a compressed simulator of the environment and training the agent inside it, [DreamerV3](https://arxiv.org/abs/2301.04104) showed the recipe mastering dozens of domains, [Genie](https://arxiv.org/abs/2402.15391) learns playable worlds directly from video, OpenAI pitched Sora as a "world simulator", and [World Labs](https://www.worldlabs.ai/) bets that spatial world models are the next frontier.

The second is about measuring them: do our current models already have world models? The evidence is mixed. Probing a sequence model trained on Othello moves recovers [a board-like representation inside it](https://arxiv.org/abs/2210.13382). On the other hand, [Vafa et al.](https://arxiv.org/abs/2406.03689) showed that a model can predict the next turn of Manhattan taxi routes with high accuracy while its implicit street map is incoherent.

Both kinds of discussion run into the same two questions: what exactly counts as a world model, and how do we measure whether an agent has learned one?

## What is a world model?

Let's start with a running example. Consider someone who has cooked in the same kitchen for a long time. They develop an intuition for it: where the tools live, how the stove behaves, how long things take. That intuition is general-purpose. It supports many different everyday capabilities about the same kitchen, not just a single dish:

- **Predict.** Estimate how long the hidden contents of a covered pot will take to finish cooking, from the steam and the elapsed time.
- **Adapt.** Change the layout of the kitchen, or swap out some ingredients: they recognize what changed and can tell whether the dish is still makeable.
- **Plan.** Plan a sequence of actions to complete a set of recipes, ordering steps so everything comes together.

This flexible, predictive, and counterfactual understanding of how an environment works is what we call a **world model**. Cognitive science treats it as a core substrate of human intelligence ([Weisberg & Gopnik 2013, *Cognitive Science*](https://doi.org/10.1111/cogs.12069)), and many researchers argue that learning such models is pivotal for the next step in AI ([LeCun 2022](https://openreview.net/forum?id=BZ5a1r-kVsf)). Hold on to the three capabilities above; they come back as the benchmark's three task families.

## How do we currently evaluate world-model learning?

We can group existing evaluations into four families. Each probes an agent's knowledge in a different and incomplete way: each captures a real capability, and each misses one.

**Non-interactive benchmarks** ([ARC](https://arxiv.org/abs/1911.01547), RAVEN, CLEVR variants) test whether you can infer hidden rules from a few static examples.

![Non-interactive evaluation: ARC rule inference beside a CLEVR scene question](/assets/img/worldtest_talk/rw_noninteractive.gif)

They capture environment-level reasoning: rule induction, concept induction, causal reasoning. But you never act in the world. The data you learn from is fixed by the benchmark designer, not gathered by your own experiments.

**Representation-based approaches** (Moving MNIST, BAIR robot pushing, DiscoveryWorld, CLEVRER, CATER, CausalWorld) require a fixed output format, next frames, text descriptions, or predicate structures, scored by format-specific proxies.

![Representation-based evaluation: pixel error rewards the blurry hedge](/assets/img/worldtest_talk/rw_representation.gif)

The proxy measures fit to the format, not the world model. Reconstruction error rewards a blurry average of possible futures over a crisp, physically right prediction. And an agent whose knowledge lives in a policy, a program, or a plan has no way to express it in the required format at all.

**Gym-like benchmarks** (Atari/ALE, OpenAI Gym, ProcGen, NetHack) provide decision-making with explicit rewards.

![Gym-like evaluation: a game of Pong where the reward counter is the only measurement](/assets/img/worldtest_talk/rw_gym_pong.gif)

Reward measures task success, not world-model quality: high performance may come from a memorized policy rather than a generalizable grasp of the environment's structure. ProcGen was built to counter exactly this, with procedurally generated levels to defeat memorization.

**Unsupervised RL benchmarks** ([URLB](https://arxiv.org/abs/2110.15191)) are the closest relative of our setup: explore without objectives first, face downstream tasks second. But both phases run in the very same environment, and evaluation only ever sees action-reward sequences, so structural and counterfactual understanding goes untested.

![Unsupervised RL: two phases, one world, versus WorldTest's modified test environment](/assets/img/worldtest_talk/rw_url.gif)

## The key idea: environment-level queries

An **environment-level query** is a question about a property of the whole environment. Answering it requires understanding the underlying rules, not just replaying what was seen. Three examples:

- **Occlusion.** What is hidden behind an occlusion? Infer the parts of the environment you cannot directly see.
- **Change.** Detect a change in the environment's dynamics. Notice when a rule of the world has shifted.
- **Reachability.** Determine whether one state is reachable from another. Reason about the global structure of what is possible.

Readers from the program synthesis community will recognize the move we are about to make. Synthesis has a long tradition of learning through queries to an oracle: Angluin's membership and equivalence queries against a minimally adequate teacher ([Angluin 1987](https://doi.org/10.1016/0890-5401(87)90052-6)), counterexample-guided inductive synthesis in sketching ([Solar-Lezama et al. 2006](https://doi.org/10.1145/1168857.1168907)), and the general theory of oracle-guided inductive synthesis ([Jha & Seshia 2017](https://doi.org/10.1007/s00236-017-0294-5)). In all of these, the interface to knowledge is a query, and the answer never depends on how the learner represents what it knows.

<div style="border-left: 4px solid #1E3A8A; background: #f3f5fb; padding: 0.9em 1.1em; border-radius: 0 8px 8px 0; margin: 1.2em 0;">
We want the same leverage for evaluating world-model learners, with the roles reversed: <strong>the benchmark interrogates the agent</strong>. The catch is that a POMDP agent does not answer propositions; it only knows how to step in an environment. So <strong>we make stepping be the question</strong>: each query is reified as a task in a derived environment, and solving the task is answering the query. The evaluation never reads the model, only behavior.
</div>

## The WorldTest protocol

WorldTest is a two-phase, behavior-based protocol.

**Interaction phase.** We give the agent a reward-free environment \\( \mathcal{M} \\), a POMDP whose dynamics it does not know. It explores freely, with no external rewards; at any time it may reset to the initial state or proceed to the test. From its interaction history it constructs an internal model \\( \widehat{\mathcal{M}} \\), which can be any representation whatsoever: a program, a latent code, a neural net. The protocol never prescribes or inspects it.

**Test phase.** The protocol instantiates an environment-level query: it samples hidden task parameters \\( \xi \\) and transforms the base environment into a derived challenge environment with an explicit objective \\( R \\) and horizon \\( H \\):

$$ (\mathcal{M}', R, H) = \tau(\mathcal{M}, \xi), \quad \xi \sim P_{\Xi} $$

The score depends only on the agent's behavior in \\( \mathcal{M}' \\). Solving the task is answering the query.

<img src="/assets/talks/worldtest/media/autumnbench_overview.png" alt="The WorldTest framework and its AutumnBench instantiation" style="max-width: 100%; height: auto; border-radius: 6px;">

Three properties fall out of this design: it is **representation-agnostic** (scored by behavior alone, so humans and AI compare on equal terms), **reward-free during learning** (interaction carries no signal to exploit), and the test happens in a **modified environment** (memorizing the training world is not enough).

## Try it yourself

This is a live AutumnBench task, running on the real platform. Explore reward-free, reset whenever you want, then take the test.

**How to interact:** click inside the frame once to give it focus. Arrow keys move; clicking a grid cell interacts with it; noop lets time pass. The Reset button restarts the world so you can rerun an experiment, and when you think you understand the rules, press Go to Test.

<div style="text-align: center; margin: 1em auto;">
  <iframe src="https://autumn.basis.ai/task-selection?taskId=Y59YE&embedded=1" width="650" style="width: 650px; max-width: 100%; height: 431px; border: 1px solid #d0d5dc; border-radius: 8px;" loading="lazy"></iframe>
</div>

More at [autumn.basis.ai](https://autumn.basis.ai).

## AutumnBench: 43 environments, 129 tasks

AutumnBench instantiates WorldTest with 43 interactive grid-world environments (grids from 3x3 to 25x25, 19 of them stochastic) and 129 tasks across three families, which are the kitchen's three capabilities, formalized:

- **Masked frame prediction** (Predict): predict the masked content of the final frame by choosing one of six options.
- **Change detection** (Adapt): one rule changes mid-test; report the earliest timestep at which it changed.
- **Planning** (Plan): drive the world into a target configuration with a sequence of actions.

The 20 environments in the [public release](https://zenodo.org/records/19498269) are all running below, right now. Every tile is its own Autumn interpreter (C++ compiled to WebAssembly) playing a random action stream.

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

<p style="text-align: center; margin: 0.6em 0 1.2em; font-size: 1.02em;"><strong style="background: #f3f5fb; border-left: 4px solid #1E3A8A; padding: 0.4em 0.8em; border-radius: 0 6px 6px 0; display: inline-block; color: #1E3A8A;">Click any world to take over; the robot backs off for a few seconds.</strong></p>

## The Autumn language

Every environment above is a short program in Autumn, a functional reactive language for specifying causal interactions in 2D grids ([Das et al., POPL 2023](https://doi.org/10.1145/3571249)). One declarative specification drives both a text interface for AI agents and the browser GUI humans play, so the exact same world is played by both:

<div style="display: flex; gap: 14px; align-items: stretch; margin: 1em 0; flex-wrap: wrap;">
<pre style="flex: 1 1 340px; min-width: 0; margin: 0; padding: 14px 16px; background: #1f2330; color: #e8eaf0; border-radius: 8px; font-size: 0.82em; line-height: 1.55; overflow-x: auto;"><code>; from sand.sexp: conditional rules
(on (clicked sandButton)
    (= clickType "sand"))
(on (& (clicked) (isFreePos click)
       (== clickType "water"))
    (= water (addObj water ...)))

; from ants.sexp: spatial, temporal,
; stochastic
(closest obj foods)
(filter (--> obj
    (! (intersects obj (prev ants))))
  (prev foods))
(randomPositions GRID_SIZE 2)</code></pre>
<div style="flex: 0 1 300px; display: flex; flex-direction: column;">
  <iframe src="/talks/basis-2026/autumn-embed/?program=Sand&compact=1" style="flex: 1; width: 100%; min-height: 280px; border: 1px solid #d0d5dc; border-radius: 8px;" loading="lazy"></iframe>
  <p style="margin: 6px 0 0; font-size: 0.82em; color: #6b7080;">Sand, live: click to drop sand; the rules on the left are running.</p>
</div>
</div>

`(on cond body)` is the conditional rule form: the guard is evaluated against the current state each tick and the body fires when it holds. The stdlib adds spatial operators (`closest`, `intersects`), temporal reads (`prev`), and stochastic primitives (`randomPositions`).

## Result

We compared 517 human participants (recruited via Prolific, screened for attention and color blindness) against five frontier reasoning models: Claude 4 Sonnet, Gemini 2.5 Pro, Gemini 2.5 Flash, o3, and Qwen3-235b-a22b-thinking-2507.

<div class="chartbox"><canvas id="bt-chart-a"></canvas></div>
<div class="chartbox"><canvas id="bt-chart-b"></canvas></div>
<div class="chartbox"><canvas id="bt-chart-c"></canvas></div>
<p style="font-size: 0.85em; color: #6b7080;">Score by stochasticity, score by task type, and per-environment score distributions. Interactive: hover the bars and violins. Data extracted from the paper's plot files.</p>

Humans beat every model, on every task family. The average human per-environment score sits around 0.935, near the ceiling; the best models hover far below. One curious split in the stochasticity chart: models did better on stochastic environments than deterministic ones, while humans were nearly identical across both. The paper reports the split as an observation and does not attribute a cause.

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

Rerunning a controlled variation of your last experiment is the signature of hypothesis testing, and it matches behavior documented in cognitive science:

<div style="border-left: 4px solid #c08230; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.06); padding: 0.8em 1em; border-radius: 0 8px 8px 0; margin: 0.9em 0;"><p style="margin: 0 0 0.35em; font-style: italic; color: #1f2330;">"Instead, people select strategies in an adaptive fashion that trades off their expected performance and cognitive effort."</p><div style="font-family: ui-monospace, monospace; font-size: 0.78em; color: #6b7080;"><a href="https://doi.org/10.1016/j.cogpsych.2015.02.004" style="color: #6b7080;">Coenen, Rehder &amp; Gureckis 2015. Strategies to intervene on causal systems are adaptively selected. Cognitive Psychology 79.</a></div></div>
<div style="border-left: 4px solid #c08230; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.06); padding: 0.8em 1em; border-radius: 0 8px 8px 0; margin: 0.9em 0;"><p style="margin: 0 0 0.35em; font-style: italic; color: #1f2330;">"...learners who freely interacted with the physical system selectively produced evidence that revealed the physical property consistent with their inquiry goal."</p><div style="font-family: ui-monospace, monospace; font-size: 0.78em; color: #6b7080;"><a href="https://doi.org/10.1016/j.cogpsych.2018.05.001" style="color: #6b7080;">Bramley, Gerstenberg, Tenenbaum &amp; Gureckis 2018. Intuitive experimentation in the physical world. Cognitive Psychology 105.</a></div></div>

One honest caveat, in the paper's own terms: this link is correlational; testing it causally would need designs that manipulate reset availability.

## Watch the winner learn

Here is what that looks like in practice. This is the top-scoring human on the mario planning task (score 0.985, the decisive winner among the twenty people who played it), and these are their five real exploration runs from the recorded data, played back time-compressed. The click pattern tells the story on its own: in run 1, all 16 clicks land in the final 13% of the run; in run 2, the first click comes 6% in; runs 3 to 5 use only 4, 1, and 1 clicks.

<div style="display: flex; gap: 18px; align-items: center; margin: 1em 0;">
  <img src="/assets/img/worldtest_talk/mario_run1.gif" alt="Run 1 of 5" style="flex: 0 0 46%; min-width: 0; border-radius: 6px;">
  <p style="flex: 1; margin: 0;"><strong>Run 1: figure out the world.</strong> One long run of pure navigation: arrows, platforms, coins, the enemy. Then, at the very end of the run, the discovery: clicking does something too. Sixteen clicks in quick succession, all in the last stretch.</p>
</div>

<div style="display: flex; gap: 18px; align-items: center; margin: 1em 0;">
  <p style="flex: 1; margin: 0;"><strong>Run 2: experiment with the new tool.</strong> They reset, and clicking starts almost immediately, ten clicks woven through a much shorter run. This is the reset-as-experiment pattern from the charts above, in the flesh: same setup, one new variable.</p>
  <img src="/assets/img/worldtest_talk/mario_run2.gif" alt="Run 2 of 5" style="flex: 0 0 46%; min-width: 0; border-radius: 6px;">
</div>

**Runs 3 to 5: consolidate and master.** The remaining runs get shorter and more economical: four clicks, then one, then one. By run 5 it looks less like exploring and more like rehearsing the solution.

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

The snake story is one instance of a deeper pattern, and it is worth slowing down on, because it is the closest thing the paper has to a mechanism for the whole gap.

Across the masked frame prediction tasks especially, reasoning models often fail to update their beliefs when the test-phase observations contradict the rules they learned. It is not that they fail to notice. The scratchpads show them registering the contradiction and then predicting from the original rules anyway. In our analysis of the traces, the finding reads: "When test-phase observations contradict exploration-phase inferences, models persist with their original interpretation." A Gemini 2.5 Pro agent, for instance, formed a gravity hypothesis from repeated noop observations, then pressed right, observed a rightward shift, and attributed the shift to a subsequent click, preserving its gravity-only model. As we put it in the paper's discussion: "This is a reasoning failure, not a memory limitation." The information is in context; the belief simply does not move.

There is a temptation to call this familiar. Psychology has documented for decades that people, too, defend beliefs against evidence: belief perseverance survives even after the original evidence is fully discredited ([Ross, Lepper & Hubbard 1975](https://doi.org/10.1037/0022-3514.32.5.880)), and confirmation bias is, in the words of the classic review:

<div style="border-left: 4px solid #c08230; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.06); padding: 0.8em 1em; border-radius: 0 8px 8px 0; margin: 0.9em 0;"><p style="margin: 0 0 0.35em; font-style: italic; color: #1f2330;">"...a ubiquitous phenomenon in many guises."</p><div style="font-family: ui-monospace, monospace; font-size: 0.78em; color: #6b7080;"><a href="https://doi.org/10.1037/1089-2680.2.2.175" style="color: #6b7080;">Nickerson 1998. Confirmation Bias: A Ubiquitous Phenomenon in Many Guises. Review of General Psychology 2(2).</a></div></div>

So why do humans win here?

Because human belief revision, whatever its biases, is *adaptive under interaction*. When people can act on a causal system, they do not restart their theory from scratch with every surprise; they make local, targeted repairs to the part of the theory the evidence touched:

<div style="border-left: 4px solid #1E3A8A; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.06); padding: 0.8em 1em; border-radius: 0 8px 8px 0; margin: 0.9em 0;"><p style="margin: 0 0 0.35em; font-style: italic; color: #1f2330;">"Formalizing Neurath's ship: Approximate algorithms for online causal learning."</p><div style="font-family: ui-monospace, monospace; font-size: 0.78em; color: #6b7080;"><a href="https://doi.org/10.1037/rev0000061" style="color: #6b7080;">Bramley, Dayan, Griffiths &amp; Lagnado 2017. Psychological Review 124(3).</a></div></div>

Neurath's image: you rebuild the ship plank by plank while staying at sea, and people patch their theories the same way, without ever stopping to rebuild from the keel. Interactive settings are exactly where this machinery shines: you feel the contradiction, you design the small experiment that isolates it, you patch the rule, and you move on. AutumnBench is built out of such settings.

The quantitative trace of this in our data is perplexity, how surprised an agent is by what it sees next. Humans reach lower normalized perplexity over the course of their interaction: their expectations sharpen as evidence accumulates, which is what calibrated revision looks like from the outside. Models show no such reliable sharpening, and their exploration perplexity barely predicts their test score. Their learning is neither targeted nor cumulative in the same way.

That is also what run 1 of the mario winner looks like from the inside: a hypothesis ("maybe clicking matters"), a burst of sixteen tests, a patched model, and a plan built on top of it. The snake trace is the same loop with the patch step missing: hypothesis, contradiction, no repair, confident wrong answer.

## What the gap really means

The human advantage is not mainly about raw knowledge. It traces to two capabilities the models lack:

1. **Strategic experimental design.** Humans use resets and interventions to test hypotheses: they reset in every environment and replay similar action subsequences around resets. Models often skip resets entirely and spend almost none of their actions probing the world.
2. **Flexible belief updating.** Humans revise their beliefs under contradiction and reach lower perplexity over interaction. Models often keep relying on the rules they first committed to.

Closing the gap likely needs better priors and advances in strategic experimental design, uncertainty quantification, and flexible belief updating, not just more compute.

## The team

Joint work by eleven authors across Basis Research Institute, DFKI, Harvard, Mila / Universite de Montreal, Cambridge, MIT, and Cornell.

<div style="display: flex; flex-wrap: wrap; gap: 14px 18px; justify-content: center; margin: 1em 0;">
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/warrier.jpg" alt="Archana Warrier" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Archana Warrier</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/dat.jpg" alt="Dat Nguyen" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #1E3A8A;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Dat Nguyen</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/naim.jpg" alt="Michelangelo Naim" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Michelangelo Naim</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/moksh.jpg" alt="Moksh Jain" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Moksh Jain</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/liang.png" alt="Yichao Liang" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Yichao Liang</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/schroeder.jpg" alt="Karen Schroeder" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Karen Schroeder</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/camyang.png" alt="Cambridge Yang" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Cambridge Yang</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/tenenbaum.jpg" alt="Joshua B. Tenenbaum" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Joshua B. Tenenbaum</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/vollmer.jpg" alt="Sebastian Vollmer" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Sebastian Vollmer</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/ellis.jpg" alt="Kevin Ellis" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Kevin Ellis</div></div>
  <div style="width: 96px; text-align: center;"><img src="/assets/talks/worldtest/media/team/tavares.jpg" alt="Zenna Tavares" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2px solid #d0d5dc;"><div style="font-size: 0.78em; line-height: 1.2; margin-top: 4px;">Zenna Tavares</div></div>
</div>

Paper: [arXiv:2510.19788](https://arxiv.org/abs/2510.19788) · Slides: [the interactive deck](/assets/talks/worldtest/) · Play: [autumn.basis.ai](https://autumn.basis.ai) · Interpreter: [BasisResearch/Autumn.cpp](https://github.com/BasisResearch/Autumn.cpp) · Baselines: [BasisResearch/MARAProtocol](https://github.com/BasisResearch/MARAProtocol)


<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@sgratzl/chartjs-chart-boxplot@4.4.4/build/index.umd.min.js"></script>
<script src="/assets/talks/worldtest/media/results_data.js"></script>
<script>
(function () {
  if (typeof Chart === 'undefined' || typeof WT_DATA === 'undefined') return;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#4a4f5a';
  var D = WT_DATA;
  var fade = function (rgb, a) { return rgb.replace('rgb(', 'rgba(').replace(')', ',' + a + ')'); };
  var plotBg = { id: 'plotBg', beforeDraw: function (c) {
    var a = c.chartArea; c.ctx.save(); c.ctx.fillStyle = '#f3f6ff'; c.ctx.fillRect(a.left, a.top, a.width, a.height); c.ctx.restore();
  } };
  var errBars = { id: 'errBars', afterDatasetsDraw: function (c) {
    var ctx = c.ctx; ctx.save(); ctx.strokeStyle = 'rgba(60,60,70,0.85)'; ctx.lineWidth = 1;
    c.data.datasets.forEach(function (ds, di) {
      if (!ds.sem) return;
      c.getDatasetMeta(di).data.forEach(function (el, i) {
        var v = ds.data[i], s = ds.sem[i];
        if (v == null || s == null) return;
        var y0 = c.scales.y.getPixelForValue(Math.max(0, v - s));
        var y1 = c.scales.y.getPixelForValue(Math.min(1, v + s));
        ctx.beginPath(); ctx.moveTo(el.x, y0); ctx.lineTo(el.x, y1);
        ctx.moveTo(el.x - 3, y0); ctx.lineTo(el.x + 3, y0);
        ctx.moveTo(el.x - 3, y1); ctx.lineTo(el.x + 3, y1); ctx.stroke();
      });
    });
    ctx.restore();
  } };
  var yScale = { min: 0, max: 1, ticks: { stepSize: 0.5 }, grid: { color: 'rgba(128,128,128,0.14)' }, title: { display: true, text: 'Score' } };
  new Chart(document.getElementById('bt-chart-a'), {
    type: 'bar',
    data: { labels: D.short, datasets: [
      { label: 'deterministic', data: D.panelA.det, sem: D.panelA.detSem, backgroundColor: 'rgb(97,156,255)' },
      { label: 'stochastic', data: D.panelA.stoch, sem: D.panelA.stochSem, backgroundColor: 'rgb(248,118,109)' } ] },
    options: { responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Score by stochasticity' } },
      scales: { y: yScale, x: { ticks: { maxRotation: 30, minRotation: 30, autoSkip: false }, grid: { display: false } } } },
    plugins: [plotBg, errBars]
  });
  new Chart(document.getElementById('bt-chart-b'), {
    type: 'bar',
    data: { labels: ['CD', 'MFP', 'PL'], datasets: D.order.map(function (a, k) {
      return { label: D.short[k], data: [D.panelB.CD.means[k], D.panelB.MFP.means[k], D.panelB.PL.means[k]],
               sem: [D.panelB.CD.sems[k], D.panelB.MFP.sems[k], D.panelB.PL.sems[k]], backgroundColor: D.colors[k] }; }) },
    options: { responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Score by task type' } },
      scales: { y: yScale, x: { grid: { display: false } } } },
    plugins: [plotBg, errBars]
  });
  var el = document.getElementById('bt-chart-c');
  if (typeof ChartBoxPlot !== 'undefined' && ChartBoxPlot.ViolinController) {
    Chart.register(ChartBoxPlot.ViolinController, ChartBoxPlot.Violin, ChartBoxPlot.BoxPlotController, ChartBoxPlot.BoxAndWiskers);
    new Chart(el, {
      type: 'violin',
      data: { labels: D.short, datasets: [
        { data: D.panelC, backgroundColor: D.colors.map(function (c) { return fade(c, 0.55); }),
          borderColor: D.colors, borderWidth: 1, itemRadius: 1.6, itemBackgroundColor: 'rgba(60,60,70,0.4)' },
        { type: 'line', data: D.panelCMeans, showLine: false, pointRadius: 4.5,
          pointBackgroundColor: 'rgba(0,0,0,0)', pointBorderColor: '#1f2330', pointBorderWidth: 1.4 } ] },
      options: { responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Per-environment score distributions' } },
        scales: { y: yScale, x: { ticks: { maxRotation: 30, minRotation: 30, autoSkip: false }, grid: { display: false } } } },
      plugins: [plotBg]
    });
  }
})();
</script>
