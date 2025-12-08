<script lang="ts">
  import { onMount } from 'svelte'
  import flipbookMapsJson from '$lib/assets/flipbook-maps.json'

  type FlipbookMap = {
    pngFilename: string
    mapId: string
    radius: number
    area: number
  }

  let maps = $state<FlipbookMap[]>([])
  let pages = $state<FlipbookMap[][]>([])

  const mapsPerPage = 6 // 2 columns × 3 rows

  onMount(() => {
    // Sort by area
    maps = [...flipbookMapsJson].sort((a, b) => a.area - b.area)

    // Group maps into pages of 6
    const pageGroups: FlipbookMap[][] = []
    for (let i = 0; i < maps.length; i += mapsPerPage) {
      pageGroups.push(maps.slice(i, i + mapsPerPage))
    }
    pages = pageGroups
  })
</script>

{#each pages as page, pageIndex}
  <section class="page grid grid-cols-2 grid-rows-3 gap-2 p-2">
    {#each page as map, cellIndex}
      <div class="grid grid-cols-[2fr_1fr] p-0">
        <img
          src="/images/{map.pngFilename}"
          alt="Map {cellIndex + 1}"
          class="h-full"
        />
        <div></div>
      </div>
    {/each}
  </section>
{/each}

<style>
  .page {
    width: 297mm;
    height: 210mm;
  }

  @media print {
    .page {
      size: 297mm 210mm;
      page-break-after: always;
      break-after: page;
    }
  }

  @page {
    size: A4 landscape;
    margin: 0;
  }
</style>
