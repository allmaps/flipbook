<script lang="ts">
  import { onMount } from 'svelte'
  import { throttle } from 'lodash-es'

  import { wrap as comlinkWrap } from 'comlink'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import CanvasRenderWorker from '$lib/shared/canvas-render-worker.js?worker&inline'

  import type { CanvasRenderWorkerType } from '$lib/shared/canvas-render-worker.js'

  type Props = {
    color: string
    map: GeoreferencedMap
    center: [number, number]
    status:
      | 'created'
      | 'mounted'
      | 'loading'
      | 'ready'
      | 'rendering'
      | 'rendered'
      | 'error'
    canvas: HTMLCanvasElement | undefined
    area: number
    radius: number
    width: number
    height: number
    drawCircles: boolean
    circleRadius: number
  }

  let {
    color,
    map,
    center,
    status = $bindable(),
    area = $bindable(),
    canvas = $bindable(),
    radius,
    width,
    height,
    drawCircles,
    circleRadius
  }: Props = $props()

  // let renderer = $state<CanvasRenderer>()

  const worker = new CanvasRenderWorker()
  const wrappedWorker = comlinkWrap<CanvasRenderWorkerType>(worker)

  let currentRadius = radius
  let currentCenter: [number, number] = [center[0], center[1]]

  async function initialize(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) {
    canvas.width = width
    canvas.height = height

    await wrappedWorker.initialize(width, height)
    // Serialize the map to plain JSON before passing to worker
    await wrappedWorker.addGeoreferencedMap(JSON.parse(JSON.stringify(map)))
  }

  async function render(width: number, height: number, radius: number) {
    // Ensure center is a plain array
    const plainCenter: [number, number] = [center[0], center[1]]
    const imageData = await wrappedWorker.render(
      plainCenter,
      width,
      height,
      radius
    )
    currentRadius = radius

    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.putImageData(imageData, 0, 0)
      }
    }
  }

  const throttledRender = throttle(
    (width: number, height: number, radius: number) => {
      status = 'rendering'
      render(width, height, radius)
        .then(() => {
          status = 'rendered'
        })
        .catch((error) => {
          console.error('Render error:', error)
          status = 'error'
        })
    },
    300,
    { leading: true, trailing: true }
  )

  $effect(() => {
    if (status === 'mounted' && canvas) {
      status = 'loading'

      initialize(canvas, width, height)
        .then(() => {
          status = 'ready'
        })
        .catch((error) => {
          console.error('Initialize error:', error)
          status = 'error'
        })
    }
  })

  $effect(() => {
    const centerChanged =
      center[0] !== currentCenter[0] || center[1] !== currentCenter[1]

    if (
      status === 'ready' ||
      (status === 'rendered' && (radius !== currentRadius || centerChanged))
    ) {
      if (centerChanged) {
        currentCenter = [center[0], center[1]]
      }
      throttledRender(width, height, radius)
    }
  })

  onMount(() => {
    status = 'mounted'
  })
</script>

<div class="w-full h-full grid grid-cols-1 grid-rows-1">
  <canvas bind:this={canvas} class="w-full h-full col-1 row-1"></canvas>
  {#if drawCircles}
    <svg
      class="w-full h-full col-1 row-1"
      width={width + 'px'}
      height={height + 'px'}
      viewBox={`0 0 ${width} ${height}`}
    >
      <circle cx={width / 2} cy={height / 2} r={circleRadius} fill={color} />
    </svg>
  {/if}
</div>
