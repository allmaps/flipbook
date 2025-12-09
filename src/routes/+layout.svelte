<script lang="ts">
  import favicon from '$lib/assets/favicon.png'

  import '../app.css'
  import '@allmaps/components/css/fonts.css'

  let { children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Allmaps Flipbook Generator</title>
</svelte:head>

{@render children()}
