<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import { parseAnnotation } from '@allmaps/annotation'
  import {
    blue,
    purple,
    orange,
    red,
    pink,
    green,
    yellow
  } from '@allmaps/tailwind'

  import Canvas from '$lib/components/Canvas.svelte'
  import Controls from '$lib/components/Controls.svelte'
  import GlobalRadius from '$lib/components/GlobalRadius.svelte'
  import Position from '$lib/components/Position.svelte'
  import PreviewModal from '$lib/components/PreviewModal.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  const DEFAULT_RADIUS = 200

  type Page = {
    radius: number
    deleted: boolean
    map: GeoreferencedMap
    status:
      | 'created'
      | 'mounted'
      | 'loading'
      | 'ready'
      | 'rendering'
      | 'rendered'
      | 'error'
    area: number
    canvas?: HTMLCanvasElement
  }

  let maps = $state<GeoreferencedMap[]>([])
  let pages = $state<Page[]>([])

  const fetchCount = 250

  let displayCount = $state(2.5)

  const defaultCenter: [number, number] = [52.37278, 4.90035]

  let center = $state<[number, number]>(defaultCenter)

  const positionParam = page.url.searchParams.get('position')

  if (positionParam) {
    const positionParts = positionParam
      .split(',')
      .map((part) => parseFloat(part))
    center = [positionParts[1], positionParts[0]]
  } else {
    center = defaultCenter
  }

  const colors = [blue, purple, orange, red, pink, green, yellow]

  let drawBackground = $state(true)
  let drawCircles = $state(true)
  let drawCircleRadius = $state(5)
  let linkedRadius = $state(false)
  let showPreviewModal = $state(false)

  // We'll divide the A4 landscape page into 6 flipbook pages
  const pageAspectRatio = Math.sqrt(2) / 2 / (1 / 3)
  // The map canvas has the same aspect ratio as the page but only takes 2/3 of the width
  // of 1/6 of the page
  const canvasAspectRatio = Math.sqrt(2) / 1

  const printDpi = 300
  const paperWidth = 297 // A4 landscape width in mm

  const mapCanvasPixelWidth = (((paperWidth / 2) * 2) / 3) * (printDpi / 25.4) // mm to inch
  const mapCanvasPixelHeight = mapCanvasPixelWidth / canvasAspectRatio

  function updateUrlParams(center: [number, number]) {
    const url = new URL(window.location.href)
    url.searchParams.set('position', `${center[1]},${center[0]}`)
    window.history.replaceState({}, '', url)
  }

  function handleCenterChange(newCenter: [number, number]) {
    center = newCenter
    updateUrlParams(newCenter)
  }

  function pageFromMap(map: GeoreferencedMap, radius = DEFAULT_RADIUS): Page {
    return {
      radius,
      status: 'created',
      area: 0,
      deleted: false,
      map
    }
  }

  function allmapsIdFromMapId(mapId: string): string {
    const parts = mapId.split('/')
    return parts[parts.length - 1]
  }

  function pngFilenameFromMapId(mapId: string, index?: number): string {
    const allmapsId = allmapsIdFromMapId(mapId)
    if (index !== undefined) {
      return `${index.toString().padStart(3, '0')}-map-${allmapsId}.png`
    }
    return `map-${allmapsId}.png`
  }

  function handleDownloadPng(page: Page, index: number) {
    if (!page.canvas || !page.map.id) {
      return
    }

    const newCanvas = document.createElement('canvas')
    newCanvas.width = page.canvas.width
    newCanvas.height = page.canvas.height

    const ctx = newCanvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Get the color for this page
    const color = colors[index % colors.length]

    if (drawBackground) {
      // Draw the background color on 2/3 of the canvas width
      ctx.fillStyle = color
      ctx.fillRect(0, 0, (newCanvas.width * 2) / 3, newCanvas.height)
    }

    // Draw the original canvas onto the new canvas
    ctx.drawImage(page.canvas, 0, 0)

    if (drawCircles) {
      // Draw the circle in the center
      const centerX = page.canvas.width / 2
      const centerY = page.canvas.height / 2
      const radius = drawCircleRadius * (printDpi / 25.4) // mm to pixels

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    const link = document.createElement('a')
    link.download = pngFilenameFromMapId(page.map.id, index)
    link.href = newCanvas.toDataURL('image/png')
    link.click()
  }

  function handleDownloadAllPngs() {
    const activePages = pages.filter((page) => !page.deleted)

    activePages.forEach((page, index) => {
      setTimeout(() => {
        handleDownloadPng(page, index)
      }, index * 300) // Delay each download by 300ms to avoid browser blocking
    })
  }

  function handleDownloadJson() {
    const json = JSON.stringify(
      pages
        .filter((page) => !page.deleted)
        .map((page) => ({
          pngFilename: pngFilenameFromMapId(page.map.id!),
          mapId: page.map.id,
          radius: page.radius,
          area: page.area
        })),
      null,
      2
    )

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flipbook-maps.json'
    link.click()
  }

  function handleAddMap() {
    if (maps.length === 0) {
      return
    }

    const lastRadius =
      pages.length > 0 ? pages[pages.length - 1].radius : DEFAULT_RADIUS

    const map = maps[0]
    pages.push(pageFromMap(map, lastRadius))
    maps = maps.slice(1)
    displayCount += 1
  }

  function handleSetLinearRadii() {
    const activePages = pages.filter((page) => !page.deleted)
    if (activePages.length === 0) return

    if (activePages.length === 1) {
      // Nothing to interpolate with single page
      return
    }

    // Get min and max radius from first and last pages
    const minRadius = activePages[0].radius
    const maxRadius = activePages[activePages.length - 1].radius

    // Set intermediate pages linearly
    activePages.forEach((page, index) => {
      const t = index / (activePages.length - 1)
      page.radius = Math.round(minRadius + t * (maxRadius - minRadius))
    })
  }

  function handlePreviewFlipbook() {
    const activePages = pages.filter((page) => !page.deleted && page.canvas)
    if (activePages.length === 0) return
    showPreviewModal = true
  }

  function handleClosePreview() {
    showPreviewModal = false
  }

  let mounted = $state(false)

  $effect(() => {
    if (!mounted) return

    const annotationsUrl = `https://annotations.allmaps.org/maps?limit=${fetchCount}&intersects=${center.join(',')}`

    // Reset pages when center changes
    pages = []
    maps = []

    fetch(annotationsUrl)
      .then((response) => response.json())
      .then((annotation) => {
        maps = parseAnnotation(annotation)

        for (const map of maps.slice(0, displayCount)) {
          pages.push(pageFromMap(map))
        }

        // Remove first displayCount maps from maps array
        maps = maps.slice(displayCount)
      })
  })

  onMount(() => {
    mounted = true
  })
</script>

<main
  class="flex flex-col items-center justify-center p-4 gap-4 max-w-7xl mx-auto"
>
  <h1 class="text-3xl font-bold">Allmaps Flipbook Generator</h1>

  <div class="flex flex-col gap-4 items-center justify-center w-full max-w-2xl">
    <Position {center} onCenterChange={handleCenterChange} />

    <div class="flex flex-row gap-6 items-center justify-center">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={drawBackground} />
        <span>Draw background</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={drawCircles} />
        <span>Draw circles</span>
      </label>
    </div>

    <div class="flex flex-row items-center gap-4 w-full">
      <label for="circle-radius">Circle radius:</label>
      <input
        id="circle-radius"
        type="range"
        min="0.1"
        max="15"
        step="0.05"
        bind:value={drawCircleRadius}
        class="flex-1"
      />
      <span class="w-16 shrink-0">{drawCircleRadius}&nbsp;mm</span>
    </div>
  </div>

  <div class="flex flex-row gap-4 items-center justify-center">
    <button class="underline cursor-pointer" onclick={handlePreviewFlipbook}
      >Preview Flipbook</button
    >
    <button class="underline cursor-pointer" onclick={handleDownloadAllPngs}
      >Download all PNGs</button
    >
    <button class="underline cursor-pointer" onclick={handleDownloadJson}
      >Download JSON</button
    >
    <button
      class="underline cursor-pointer"
      onclick={() => pages.sort((a, b) => a.area - b.area)}>Sort by area</button
    >
    <button
      class="underline cursor-pointer"
      onclick={() => pages.forEach((page) => (page.deleted = false))}
      >Restore all</button
    >
  </div>
  <GlobalRadius
    {linkedRadius}
    onLinkedRadiusChange={(value) => (linkedRadius = value)}
    onSetLinearRadii={handleSetLinearRadii}
  />
  <ol class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 w-full gap-4">
    {#each pages.filter((page) => !page.deleted) as page, index (page.map.id)}
      {@const color = colors[index % colors.length]}
      <li
        class="w-full flex flex-col shadow-lg p-4 rounded-xl gap-4"
        class:animate-pulse={page.status === 'loading' ||
          page.status === 'rendering'}
        style:background-color={`rgb(from ${color} r g b / 20%)`}
      >
        <div
          class="bg-white flex justify-end"
          style:aspect-ratio={pageAspectRatio}
        >
          <div class="w-2/3" style:background-color={color}>
            <Canvas
              {color}
              map={page.map}
              {center}
              bind:status={page.status}
              bind:area={page.area}
              radius={page.radius}
              bind:canvas={page.canvas}
              width={mapCanvasPixelWidth}
              height={mapCanvasPixelHeight}
              {drawCircles}
              circleRadius={drawCircleRadius}
              dpi={printDpi}
            />
          </div>
        </div>
        <div class="flex flex-row items-center justify-between gap-2">
          <button
            class="bg-green-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-green-300 transition-colors"
            onclick={() => handleDownloadPng(page, index)}>Save as PNG</button
          >
          <a
            class="underline cursor-pointer"
            href="https://viewer.allmaps.org/?url={page.map.id}"
            >Open in Allmaps Viewer</a
          >
        </div>
        <div>
          <Controls
            disabled={page.status === 'loading' || page.status === 'rendering'}
            bind:radius={page.radius}
            linked={linkedRadius}
            {pages}
            ondelete={() => (page.deleted = true)}
          />
        </div>
      </li>
    {/each}
  </ol>
  {#if displayCount < fetchCount}
    <button
      class="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-300 transition-colors"
      onclick={handleAddMap}
    >
      Load another map
    </button>
  {/if}
</main>

{#if showPreviewModal}
  <PreviewModal {pages} onClose={handleClosePreview} />
{/if}
