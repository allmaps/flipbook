<script lang="ts">
  import type { GeoreferencedMap } from '@allmaps/annotation'

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

  type Props = {
    pages: Page[]
    onClose: () => void
  }

  let { pages, onClose }: Props = $props()

  let currentIndex = $state(0)
  let interval: ReturnType<typeof setInterval> | null = null
  let speed = $state(10) // fps

  const activePages = $derived(
    pages.filter((page) => !page.deleted && page.canvas)
  )
  const currentPage = $derived(activePages[currentIndex])

  function startAnimation() {
    if (interval) {
      clearInterval(interval)
    }
    interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % activePages.length
    }, 1000 / speed)
  }

  function handleClose() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    onClose()
  }

  function drawPreviewCanvas(
    node: HTMLCanvasElement,
    sourceCanvas: HTMLCanvasElement
  ) {
    const ctx = node.getContext('2d')
    if (ctx) {
      ctx.drawImage(sourceCanvas, 0, 0)
    }
    return {
      update(newSourceCanvas: HTMLCanvasElement) {
        const ctx = node.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, node.width, node.height)
          ctx.drawImage(newSourceCanvas, 0, 0)
        }
      }
    }
  }

  // Start animation when component mounts
  $effect(() => {
    if (activePages.length > 0) {
      startAnimation()
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  })

  // Restart animation when speed changes
  $effect(() => {
    if (speed && activePages.length > 0) {
      startAnimation()
    }
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
  onclick={handleClose}
>
  <div
    class="bg-white rounded-lg p-8 max-w-4xl max-h-[90vh] flex flex-col gap-4"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">Flipbook Preview</h2>
      <button
        class="text-gray-500 hover:text-gray-700 text-2xl"
        onclick={handleClose}
      >
        ✕
      </button>
    </div>
    <div class="flex-1 flex items-center justify-center">
      {#if currentPage && currentPage.canvas}
        <canvas
          class="max-w-full max-h-[70vh] object-contain"
          width={currentPage.canvas.width}
          height={currentPage.canvas.height}
          use:drawPreviewCanvas={currentPage.canvas}
        />
      {/if}
    </div>
    <div class="flex flex-row items-center gap-4">
      <label for="speed">Speed:</label>
      <input
        id="speed"
        type="range"
        min="1"
        max="30"
        step="1"
        bind:value={speed}
        class="flex-1"
      />
      <span class="w-16 shrink-0">{speed} fps</span>
    </div>
    <div class="text-center text-gray-600">
      Frame {currentIndex + 1} of {activePages.length}
    </div>
  </div>
</div>
