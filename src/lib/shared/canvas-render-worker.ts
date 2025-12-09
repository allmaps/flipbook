import { expose, transfer } from 'comlink'

import { circle as turfCircle } from '@turf/circle'
import { bbox as turfBbox } from '@turf/bbox'

import { bboxToRectangle } from '@allmaps/stdlib'
import { lonLatToWebMercator } from '@allmaps/project'
import { Viewport } from '@allmaps/render'
import { CanvasRenderer } from '@allmaps/render/canvas'

import type { Point, Bbox } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'

let renderer: CanvasRenderer | undefined

const api = {
  async initialize(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height)

    canvas.width = width
    canvas.height = height

    // @ts-expect-error Should allow OffscreenCanvas
    renderer = new CanvasRenderer(canvas)
  },

  async addGeoreferencedMap(map: GeoreferencedMap) {
    if (!renderer) {
      throw new Error('Renderer not initialized')
    }
    await renderer.addGeoreferencedMap(map)
  },

  async render(center: Point, width: number, height: number, radius: number) {
    if (!renderer) {
      throw new Error('Renderer not initialized')
    }

    renderer.tileCache.clear()

    const circle = turfCircle([center[1], center[0]], radius, {
      units: 'meters',
      steps: 64
    })

    const latLonBbox = turfBbox(circle) as Bbox

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

    const ctx = renderer.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('Could not get 2d context from canvas')
    }

    const imageData = ctx.getImageData(0, 0, width, height)

    return transfer(imageData, [imageData.data.buffer])
  }
}

expose(api)

export type CanvasRenderWorkerType = typeof api
