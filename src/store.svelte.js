class AppStore {
  activeTab = $state('synthetic'); // 'synthetic' | 'survey'
  distribution = $state(null);
  centerX = $state(0.5);
  centerY = $state(0.5);
  stdDev = $state(0.1);
  rectWidth = $state(0.3);
  rectHeight = $state(0.3);
  discRadius = $state(0.2);
  pointType = $state('voter');
  count = $state(20);

  // Survey tab state
  surveyXAxis = $state(null);   // index id for x axis
  surveyYAxis = $state(null); // index id for y axis
  // rankings: { indexId: [col, col, ...] } — order = importance (first = most important)
  surveyRankings = $state(null); // null = use defaults from surveyIndexes.js
  surveyData = $state(null);     // loaded respondent array from survey_data.json

  // legacy (kept for now, unused)
  selectedIdeologies = $state([]);
  surveyCount = $state(20);
  indicateParty = $state(false);

  uploadedFile = $state(null);

  layers = $state([]);
  electionResult = $state(null);
  isGenerating = $state(false);
  addMode = $state(null);
  selectingCenter = $state(false);
  showVoters = $state(true);
  showCandidates = $state(true);
  method = $state('plurality');
  numWinners = $state(1);
  editingLayerId = $state(null);
  highlightedLayerId = $state(null);
  tutorialMode = $state(false);
  activeTutorialIdx = $state(0);
  activeTutorialStep = $state(0);
  surveyXRankOpen = $state(false);
  surveyYRankOpen = $state(false);
  surveyWasDeleted = $state(false);
}

export const store = new AppStore();
