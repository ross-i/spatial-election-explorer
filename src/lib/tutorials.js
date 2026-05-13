function spread(cx, cy, r, n) {
  return Array.from({ length: n }, (_, i) => {
    const angle = i * 2.39996;
    const dist = r * Math.sqrt((i + 0.5) / n);
    return {
      x: Math.min(0.97, Math.max(0.03, cx + dist * Math.cos(angle))),
      y: Math.min(0.97, Math.max(0.03, cy + dist * Math.sin(angle))),
    };
  });
}

let _id = 0;
function layer(type, label, points) {
  return { id: `tut-${_id++}`, type, label, visible: true, points };
}

// Candidate-only result layer (no voters) for the "reveal winner" step
function result(candidates) {
  return [{ points: candidates }];
}

// Shared layer sets — defined once so step 1 and step 2 share the same objects
const pluralityLayers = [
  layer('candidate', 'Candidate A', [{ x: 0.2,  y: 0.5  }]),
  layer('candidate', 'Candidate B', [{ x: 0.72, y: 0.35 }]),
  layer('candidate', 'Candidate C', [{ x: 0.72, y: 0.65 }]),
  layer('voter', 'A bloc (18 voters)', spread(0.2,  0.5,  0.10, 18)),
  layer('voter', 'B bloc (16 voters)', spread(0.72, 0.35, 0.12, 16)),
  layer('voter', 'C bloc (16 voters)', spread(0.72, 0.65, 0.12, 16)),
];

const bordaLayers = [
  layer('candidate', 'Candidate A', [{ x: 0.18, y: 0.5 }]),
  layer('candidate', 'Candidate B', [{ x: 0.52, y: 0.5 }]),
  layer('candidate', 'Candidate C', [{ x: 0.82, y: 0.5 }]),
  layer('voter', 'Left voters (22)',   spread(0.18, 0.5, 0.13, 22)),
  layer('voter', 'Center voters (30)', spread(0.52, 0.5, 0.14, 30)),
  layer('voter', 'Right voters (22)',  spread(0.82, 0.5, 0.13, 22)),
];

const irvLayers = [
  layer('candidate', 'Candidate A', [{ x: 0.2,  y: 0.5  }]),
  layer('candidate', 'Candidate B', [{ x: 0.73, y: 0.37 }]),
  layer('candidate', 'Candidate C', [{ x: 0.68, y: 0.63 }]),
  layer('voter', 'Left bloc (22)',        spread(0.2,  0.5,  0.10, 22)),
  layer('voter', 'Upper-right bloc (20)', spread(0.73, 0.37, 0.13, 20)),
  layer('voter', 'Lower-right bloc (20)', spread(0.68, 0.63, 0.13, 20)),
];

const multiLayers = [
  layer('candidate', 'Candidate A', [{ x: 0.22, y: 0.55 }]),
  layer('candidate', 'Candidate B', [{ x: 0.22, y: 0.38 }]),
  layer('candidate', 'Candidate C', [{ x: 0.75, y: 0.50 }]),
  layer('candidate', 'Candidate D', [{ x: 0.75, y: 0.30 }]),
  layer('voter', 'Left cluster (28)',  spread(0.22, 0.47, 0.14, 28)),
  layer('voter', 'Right cluster (28)', spread(0.75, 0.42, 0.14, 28)),
];

export const TUTORIALS = [
  {
    title: 'Welcome',
    subtitle: 'The Spatial Model of Voting',
    steps: [
      {
        heading: 'What is the spatial model?',
        content: [
          `Politicians and voters can be placed as points in a two-dimensional "policy space." Each axis represents a political dimension — for example, economic policy on one axis, social policy on the other.`,
          `Voters prefer the candidate closest to their own position. This simple geometric assumption captures a surprisingly rich range of real-world dynamics.`,
        ],
        layers: [],
        electionResult: null,
      },
      {
        heading: 'What this tool does',
        content: [
          `This explorer lets you design your own electorate — place voter blocs and candidates anywhere in the space — then run elections under different voting rules.`,
          `The same set of voters and candidates can produce very different winners depending on the rule you choose. The tutorials ahead walk through five classic examples.`,
          `When you're ready to experiment on your own, click "back to explorer" in the sidebar.`,
        ],
        layers: [],
        electionResult: null,
      },
    ],
  },
  {
    title: 'Plurality Voting',
    subtitle: 'One vote, one winner',
    steps: [
      {
        heading: 'Meet the candidates and voters',
        content: [
          `Three candidates are running. Candidate A is on the left of the policy space with a tight, loyal bloc of 18 supporters. Candidates B and C are on the right, each with 16 supporters, but clustered close to each other.`,
          `Under plurality voting, each voter casts one vote for their nearest candidate. No ranking, no runoff — the most votes wins.`,
          `Who do you think wins?`,
        ],
        layers: pluralityLayers,
        electionResult: null,
      },
      {
        heading: 'Candidate A wins — with only 36% of the vote',
        content: [
          `Candidate A takes all 18 left-bloc votes. But Candidates B and C split the 32 right-side votes almost evenly — 16 each. The right never unites behind a single candidate.`,
          `Result: A wins with 36%, B gets 32%, C gets 32%. A majority of voters preferred the right side, but the vote-splitting handed the election to A.`,
          `This spoiler effect is one of the oldest critiques of plurality systems. Try it yourself on the explorer — add these same clusters and run "plurality."`,
        ],
        layers: pluralityLayers,
        electionResult: result([
          { x: 0.2,  y: 0.5,  winner: true  },
          { x: 0.72, y: 0.35, winner: false },
          { x: 0.72, y: 0.65, winner: false },
        ]),
      },
    ],
  },
  {
    title: 'Instant-Runoff (IRV)',
    subtitle: 'Eliminating the weakest, round by round',
    steps: [
      {
        heading: 'Three candidates, one ranked ballot',
        content: [
          `The setup looks familiar: Candidate A holds the left, while B and C compete for right-leaning voters. Voters submit a full ranking of all three candidates.`,
          `IRV works in rounds. The candidate with the fewest first-preference votes is eliminated each round, and their supporters' votes transfer to the voter's next choice.`,
          `With B and C splitting the right, one of them will be eliminated first. What happens to those votes?`,
        ],
        layers: irvLayers,
        electionResult: null,
      },
      {
        heading: 'Round 1: C is eliminated — votes transfer to B',
        content: [
          `C has slightly fewer first-preference votes than B and is eliminated. Every voter who ranked C first had B as their second choice — so all those votes flow to B.`,
          `B now holds a combined majority of the right-side votes and defeats A.`,
          `IRV largely neutralizes the spoiler effect: even with two similar candidates on the right, the weaker one is dropped and their support consolidates. The majority preference wins.`,
        ],
        layers: irvLayers,
        electionResult: result([
          { x: 0.2,  y: 0.5,  winner: false },
          { x: 0.73, y: 0.37, winner: true  },
          { x: 0.68, y: 0.63, winner: false },
        ]),
      },
    ],
  },
  {
    title: 'Borda Count',
    subtitle: 'Rewarding broad appeal',
    steps: [
      {
        heading: 'The same voters — but now they rank all candidates',
        content: [
          `Three candidates are spread across the policy space: A on the left, B in the center, C on the right. Each voter group is roughly the same size.`,
          `Under Borda Count, voters rank all candidates. A candidate earns 2 points for each first-place ranking, 1 for second, and 0 for last. The highest total wins.`,
          `With three equally-sized blocs, who has the broadest appeal?`,
        ],
        layers: bordaLayers,
        electionResult: null,
      },
      {
        heading: 'Candidate B wins — the consensus choice',
        content: [
          `The left bloc ranks A first, B second, C last. The right bloc ranks C first, B second, A last. The center bloc ranks B first.`,
          `Candidate B earns a second-place vote from nearly everyone — accumulating enough points to win, even without being anyone's passionate first choice.`,
          `Borda Count tends to elect centrist "consensus" candidates. That can reduce polarization, but critics argue it underweights strong majority preferences.`,
        ],
        layers: bordaLayers,
        electionResult: result([
          { x: 0.18, y: 0.5, winner: false },
          { x: 0.52, y: 0.5, winner: true  },
          { x: 0.82, y: 0.5, winner: false },
        ]),
      },
    ],
  },
  {
    title: 'Multi-Winner (STV)',
    subtitle: 'Electing a representative committee',
    steps: [
      {
        heading: 'Four candidates, two seats to fill',
        content: [
          `Not all elections choose one winner. Councils and committees elect multiple representatives. A good multi-winner rule should reflect the diversity of the electorate.`,
          `Here, two voter clusters sit on opposite sides of the policy space. Four candidates compete for two seats — two near the left cluster, two near the right.`,
          `A simple plurality block vote would let the larger cluster sweep both seats. What does a proportional method do instead?`,
        ],
        layers: multiLayers,
        electionResult: null,
      },
      {
        heading: 'STV elects one winner from each cluster',
        content: [
          `Under the Single Transferable Vote, candidates must reach a quota of votes to win. Surplus votes transfer; the weakest candidate is eliminated each round until all seats are filled.`,
          `The left cluster elects Candidate A; the right cluster elects Candidate C. Each voter community gets a representative — a proportional outcome the block plurality system could not deliver.`,
          `Try it in the explorer: set "# winners" to 2 and run "STV" on a similar setup.`,
        ],
        layers: multiLayers,
        electionResult: result([
          { x: 0.22, y: 0.55, winner: true  },
          { x: 0.22, y: 0.38, winner: false },
          { x: 0.75, y: 0.50, winner: true  },
          { x: 0.75, y: 0.30, winner: false },
        ]),
      },
    ],
  },
];
