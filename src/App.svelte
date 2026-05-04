<script>
  import { run_election } from "./bridge.js";
  import { dummyLayers } from "./dummy.js";

  async function handleClick() {
    const result = await run_election(dummyLayers, "plurality", 1);
    console.log(result);
  }
</script>

<main>
  <button on:click={handleClick}>Run Election</button>
</main>
