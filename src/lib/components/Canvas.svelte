<script lang="ts">
  import { onMount } from 'svelte'

  import { circle as turfCircle } from '@turf/circle'
  import { bbox as turfBbox } from '@turf/bbox'
  import { area as turfArea } from '@turf/area'

  import {
    bboxToRectangle,
    bboxToPolygon,
    polygonToGeojsonPolygon
  } from '@allmaps/stdlib'
  import { lonLatToWebMercator } from '@allmaps/project'
  import { Viewport } from '@allmaps/render'
  import { CanvasRenderer } from '@allmaps/render/canvas'

  import type { Bbox } from '@allmaps/types'
  import type { GeoreferencedMap } from '@allmaps/annotation'

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

  let renderer = $state<CanvasRenderer>()

  let currentRadius = radius

  async function initialize(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) {
    canvas.width = width
    canvas.height = height

    renderer = new CanvasRenderer(canvas)
    await renderer.addGeoreferencedMap(map)
  }

  async function render(
    renderer: CanvasRenderer,
    width: number,
    height: number,
    radius: number
  ) {
    renderer.tileCache.clear()

    const circle = turfCircle([center[1], center[0]], radius, {
      units: 'meters',
      steps: 64
    })

    const latLonBbox = turfBbox(circle) as Bbox

    area = Math.round(
      turfArea(polygonToGeojsonPolygon(bboxToPolygon(latLonBbox)))
    )

    const sphericalMercatorBbox: Bbox = [
      ...lonLatToWebMercator([latLonBbox[0], latLonBbox[1]]),
      ...lonLatToWebMercator([latLonBbox[2], latLonBbox[3]])
    ] as Bbox

    const sphericalMercatorRectangle = bboxToRectangle(sphericalMercatorBbox)

    const viewport = Viewport.fromSizeAndProjectedGeoPolygon(
      [width, height],
      [sphericalMercatorRectangle],
      { devicePixelRatio: 1 }
    )

    await renderer.render(viewport)
    currentRadius = radius
  }

  $effect(() => {
    if (status === 'mounted' && canvas) {
      status = 'loading'
      initialize(canvas, width, height)
        .then(() => {
          status = 'ready'
        })
        .catch(() => {
          status = 'error'
        })
    }
  })

  $effect(() => {
    if (
      renderer &&
      (status === 'ready' ||
        (status === 'rendered' && radius !== currentRadius))
    ) {
      status = 'rendering'
      render(renderer, width, height, radius)
        .then(() => {
          status = 'rendered'
        })
        .catch(() => {
          status = 'error'
        })
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
