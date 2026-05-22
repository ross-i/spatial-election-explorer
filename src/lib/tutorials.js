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
  {
    title: 'Synthetic Mode',
    subtitle: 'Build an electorate from scratch',
    walkthrough: true,
    steps: [
      {
        heading: 'Welcome to the Synthetic tab',
        content: [
          `The five tutorials so far used fixed scenarios. The Synthetic tab hands the design to you: instead of placing points one by one, you describe a cluster with a statistical distribution and the tool samples it onto the policy space.`,
          `The Synthetic tab is already open on the right. The plot stays empty until you describe and add a batch of points — let's build one.`,
        ],
        target: '[data-walkthrough="synthetic-tab-btn"]',
        prep: (s) => {
          s.activeTab = 'synthetic';
          s.layers = [];
          s.electionResult = null;
          s.distribution = null;
          s.editingLayerId = null;
          s.pointType = 'voter';
        },
      },
      {
        heading: 'Choose a distribution',
        content: [
          `A distribution is the shape the sampled points fall into. Gaussian clusters them tightly around a center; Uniform Rect spreads them evenly across a box; Uniform Disc fills a circle.`,
          `Pick one of the three — we'll move on as soon as you do.`,
        ],
        target: '[data-walkthrough="synthetic-dist-row"]',
        prep: (s) => {
          s.activeTab = 'synthetic';
          s.distribution = null;
        },
        advanceWhen: (s) => !!s.distribution,
      },
      {
        heading: 'Shape and position the cluster',
        content: [
          `With a distribution chosen, the parameter controls appear. The spread control — standard deviation, width/height, or radius depending on the distribution — sets how tightly the points pack.`,
          `Watch the plot on the left: a live preview traces the cluster as you adjust. For a Gaussian, the nested dashed rings mark one, two, and three standard deviations out from the center, so you can see exactly how far the spread reaches.`,
          `You don't have to type coordinates to place it — grab the crosshair at the center and drag the whole distribution anywhere on the plot. (The "select" button and the (x, y) inputs do the same thing if you'd rather be precise.)`,
        ],
        target: '[data-walkthrough="synthetic-config"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        prep: (s) => {
          s.activeTab = 'synthetic';
          if (!s.distribution) s.distribution = 'gaussian';
        },
      },
      {
        heading: 'Voters or candidates, and how many',
        content: [
          `Every batch is either a bloc of voters or a set of candidates — the "Type" toggle decides which. "Count" sets how many points this batch drops onto the plot.`,
          `You'll need both kinds in the space before an election means anything: candidates to vote for, and voters to do the voting.`,
        ],
        target: '[data-walkthrough="synthetic-type"]',
        prep: (s) => {
          s.activeTab = 'synthetic';
          if (!s.distribution) s.distribution = 'gaussian';
          s.pointType = 'voter';
          s.count = 50;
        },
      },
      {
        heading: 'Add a bloc of voters',
        content: [
          `With "Voter" selected, click "add data" to commit the current settings as a voter layer. It shows up in the Data Points list, where you can hide, edit, or delete it.`,
          `An election needs voters and candidates both — let's add the voters first. Or just click "next" and we'll add this voter bloc for you.`,
        ],
        target: '[data-walkthrough="add-data-btn"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        addDataOnNext: true,
        prep: (s) => {
          s.activeTab = 'synthetic';
          if (!s.distribution) s.distribution = 'gaussian';
          s.pointType = 'voter';
          s.count = 50;
        },
        advanceWhen: (s) => s.layers.some((l) => l.type === 'voter'),
      },
      {
        heading: 'Now add some candidates',
        content: [
          `Repeat the recipe for candidates: the "Type" toggle has been switched to "Candidate". Aim the cluster wherever you want the contenders to stand — a small spread and a low count works well — then click "add data" again.`,
          `Voters pick the nearest candidate, so where you place these decides the race. Or just click "next" and we'll add this candidate batch for you.`,
        ],
        target: '[data-walkthrough="add-data-btn"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        addDataOnNext: true,
        prep: (s) => {
          s.activeTab = 'synthetic';
          if (!s.distribution) s.distribution = 'gaussian';
          s.pointType = 'candidate';
          s.count = 5;
        },
        advanceWhen: (s) => s.layers.some((l) => l.type === 'candidate'),
      },
      {
        heading: 'Run the election',
        content: [
          `Now that voters and candidates are both on the plot, pick a voting rule from the dropdown and click "run election." The winners are highlighted — the same payoff as the earlier tutorials, but on an electorate you designed.`,
          `That's the full loop: describe clusters, place voters and candidates, and compare rules. Click "back to explorer" whenever you want to experiment freely, or continue to see the same idea with real survey data.`,
        ],
        target: '[data-walkthrough="run-election-row"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        prep: (s) => {
          s.activeTab = 'synthetic';
          if (!s.distribution) s.distribution = 'gaussian';
        },
      },
    ],
  },
  {
    title: 'Survey Mode',
    subtitle: 'From hypothetical voters to real respondents',
    walkthrough: true,
    steps: [
      {
        heading: 'Welcome to the Survey tab',
        content: [
          `So far the voters and candidates have been discussed in an abstract policy space. The Survey tab swaps that out for a real electorate: respondents from the Fall 2014 Statewide IL Poll, each plotted from their own survey answers.`,
          `The Survey tab is already open on the right. The plot stays empty until you pick what the two axes mean — let's do that next.`,
        ],
        target: '[data-walkthrough="survey-tab-btn"]',
        prep: (s) => {
          s.activeTab = 'survey';
          s.layers = [];
          s.electionResult = null;
          s.surveyXAxis = null;
          s.surveyYAxis = null;
          s.surveyXRankOpen = false;
          s.surveyYRankOpen = false;
        },
      },
      {
        heading: 'Pick an index for the X axis',
        content: [
          `Each respondent answered many questions, grouped into thematic indexes (Role of Government, Social Issues, Guns). Click any pill on the X row to choose what the horizontal axis means.`,
          `The axis runs from 0 to 1, with end labels telling you what each extreme means. Go ahead and pick one — we'll move on as soon as you do.`,
        ],
        target: '[data-walkthrough="x-axis-pills"]',
        prep: (s) => {
          s.activeTab = 'survey';
          s.surveyXAxis = null;
          s.surveyYAxis = null;
          s.surveyXRankOpen = false;
          s.surveyYRankOpen = false;
        },
        advanceWhen: (s) => !!s.surveyXAxis,
      },
      {
        heading: 'Rank the questions inside the index',
        content: [
          `Now that you've picked an index, the ranking panel for it has opened. Each index is built from several questions, and they don't all matter equally — the top question gets the largest weight, the bottom one the smallest.`,
          `Drag a row to reorder. The weight percentages on the right update live, and once respondents are on the plot they'll re-project as you drag. "reset order" returns to the default ranking.`,
        ],
        target: '[data-walkthrough="rank-panel"]',
        prep: (s) => {
          s.activeTab = 'survey';
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          s.surveyXRankOpen = true;
        },
      },
      {
        heading: 'Pick a different index for the Y axis',
        content: [
          `Same idea — choose an index for the vertical axis. It just needs to be different from your X pick.`,
        ],
        target: '[data-walkthrough="y-axis-pills"]',
        prep: (s) => {
          s.activeTab = 'survey';
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          s.surveyYAxis = null;
        },
        advanceWhen: (s) => !!s.surveyYAxis && s.surveyYAxis !== s.surveyXAxis,
      },
      {
        heading: 'Add a random candidate',
        content: [
          `The "Random candidate" button generates a candidate by randomly assigning an answer to every survey question. Their position on the plot is then calculated from those randomly-chosen answers using the same weighted scoring as the voter respondents.`,
          `Click the button to add one now, or click "next" and we'll add one for you.`,
        ],
        target: '[data-walkthrough="random-candidate-btn"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        addRandomCandidatesOnNext: 1,
        prep: (s) => {
          s.activeTab = 'survey';
          s.addMode = null;
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          if (!s.surveyYAxis || s.surveyYAxis === s.surveyXAxis) s.surveyYAxis = 'social';
        },
        advanceWhen: (s) => s.layers.filter((l) => l.type === 'candidate').length >= 1,
      },
      {
        heading: 'Edit a candidate\'s survey responses',
        content: [
          `Every candidate added this way carries a full profile of survey answers. Click the pencil icon next to the candidate in the list on the right to open the editor. Change any answer and the candidate moves on the plot in real time.`,
          `Press "n" inside the editor to rename the candidate or change their color. When you're done exploring, click "next."`,
        ],
        target: '[data-walkthrough="candidate-list"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        prep: (s) => {
          s.activeTab = 'survey';
          s.addMode = null;
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          if (!s.surveyYAxis || s.surveyYAxis === s.surveyXAxis) s.surveyYAxis = 'social';
        },
      },
      {
        heading: 'Build a profile candidate yourself',
        content: [
          `"Profile candidate" opens a questionnaire where you answer the survey questions directly to define a candidate's position. Each answer you give shifts the candidate on the plot — you're essentially designing where they stand.`,
          `Click the button below to open the form and fill it out, then come back and click "next" to continue.`,
        ],
        target: '[data-walkthrough="profile-candidate-btn"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        prep: (s) => {
          s.activeTab = 'survey';
          s.addMode = null;
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          if (!s.surveyYAxis || s.surveyYAxis === s.surveyXAxis) s.surveyYAxis = 'social';
        },
      },
      {
        heading: 'Place a candidate by clicking the plot',
        content: [
          `The "+candidate" button in the toolbar (or press "c") activates placement mode — the cursor becomes a crosshair. Click anywhere on the plot to drop a candidate at that exact position.`,
          `Unlike survey-button candidates, these position-placed candidates have no profile attached: they can't be edited with the pencil, they don't move when rankings change, and they'll be removed if you switch the axis topic. Use them for quick spatial experiments; use the survey buttons when you want a candidate whose position is grounded in real responses.`,
        ],
        target: '[data-walkthrough="add-candidate-btn"]',
        extraTargets: ['[data-walkthrough="plot-area"]'],
        prep: (s) => {
          s.activeTab = 'survey';
          s.addMode = 'candidate';
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          if (!s.surveyYAxis || s.surveyYAxis === s.surveyXAxis) s.surveyYAxis = 'social';
        },
      },
      {
        heading: 'Run the election',
        content: [
          `With candidates on the plot, pick a voting rule from the dropdown and click "run election." The winners are highlighted — just like the earlier tutorials, but now over real survey respondents.`,
          `That's the full loop: shape the space with rankings, populate it with candidates, and compare voting rules on real data. Click "back to explorer" whenever you're ready to experiment freely.`,
        ],
        target: '[data-walkthrough="run-election-row"]',
        prep: (s) => {
          s.activeTab = 'survey';
          s.addMode = null;
          if (!s.surveyXAxis) s.surveyXAxis = 'gov';
          if (!s.surveyYAxis || s.surveyYAxis === s.surveyXAxis) s.surveyYAxis = 'social';
        },
      },
    ],
  },
];
