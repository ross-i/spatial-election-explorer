class AppStore {
  activeTab = $state('synthetic');
  distribution = $state(null);
  centerX = $state(0.5);
  centerY = $state(0.5);
  stdDev = $state(0.1);
  rectWidth = $state(0.3);
  rectHeight = $state(0.3);
  discRadius = $state(0.2);
  pointType = $state('voter');
  count = $state(20);

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
}

export const store = new AppStore();
